import pytest
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from core.models import Film, Genre, Comment, Rating, UserProfile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from unittest.mock import patch
import os
import logging
from django.conf import settings
from axes.models import AccessAttempt
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

@pytest.mark.django_db
class TestAuthentication(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpassword123')
        self.token = RefreshToken.for_user(self.user)
        self.recaptcha_response = {'success': True, 'score': 0.9}

    @patch('requests.post')
    def test_token_obtain_with_recaptcha(self, mock_post):
        """Проверка получения токена с reCAPTCHA"""
        mock_post.return_value.json.return_value = self.recaptcha_response
        url = reverse('token_obtain_pair')
        data = {
            'username': 'testuser',
            'password': 'testpassword123',
            'recaptcha_token': 'valid_token'
        }
        response = self.client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['recaptcha_score'] == 0.9

    @patch('requests.post')
    def test_token_obtain_failed_recaptcha(self, mock_post):
        """Проверка отказа при низком reCAPTCHA score"""
        mock_post.return_value.json.return_value = {'success': True, 'score': 0.3}
        url = reverse('token_obtain_pair')
        data = {
            'username': 'testuser',
            'password': 'testpassword123',
            'recaptcha_token': 'low_score_token'
        }
        response = self.client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        response_data = response.json()
        assert 'error' in response_data
        assert response_data['recaptcha_score'] == 0.3

    def test_token_obtain_without_recaptcha(self):
        """Проверка отказа без reCAPTCHA токена"""
        url = reverse('token_obtain_pair')
        data = {
            'username': 'testuser',
            'password': 'testpassword123'
        }
        response = self.client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        response_data = response.json()
        assert response_data['error'] == 'Пожалуйста, пройдите проверку reCAPTCHA'

    def test_access_protected_endpoint_without_token(self):
        """Проверка доступа к защищенному эндпоинту без токена"""
        url = reverse('user-profile')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data['detail'] == 'Authentication credentials were not provided.'

    def test_access_with_invalid_token(self):
        """Проверка доступа с поддельным токеном"""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalidtoken123')
        url = reverse('user-profile')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch('requests.post')
    def test_register_with_recaptcha(self, mock_post):
        """Проверка регистрации с reCAPTCHA"""
        mock_post.return_value.json.return_value = self.recaptcha_response
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'Newpassword123!',
            'password2': 'Newpassword123!',
            'recaptcha_token': 'valid_token'
        }
        response = self.client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert User.objects.filter(username='newuser').exists()

    @patch('requests.post')
    def test_axes_lockout(self, mock_post):
        """Проверка блокировки после 5 неудачных попыток входа"""
        AccessAttempt.objects.all().delete()
        mock_post.return_value.json.return_value = {'success': True, 'score': 0.9}
        url = reverse('token_obtain_pair')
        data = {
            'username': 'testuser',
            'password': 'wrongpassword',
            'recaptcha_token': 'valid_token'
        }
        for i in range(5):
            response = self.client.post(url, data)
            expected_status = status.HTTP_401_UNAUTHORIZED if i < 4 else status.HTTP_403_FORBIDDEN
            assert response.status_code == expected_status, f"Attempt {i+1} returned {response.status_code}"
        assert AccessAttempt.objects.filter(username='testuser').exists()

@pytest.mark.django_db
class TestAPI(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpassword123')
        self.token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token.access_token}')
        self.genre = Genre.objects.create(name='Action')
        self.film = Film.objects.create(
            title='Test Film',
            description='Test Description',
            release_date='2023-01-01',
            duration=120,
            video=SimpleUploadedFile('test.mp4', b'file_content', content_type='video/mp4')
        )
        self.film.genres.add(self.genre)

    def test_film_list_with_filters(self):
        """Проверка поиска фильмов"""
        assert Film.objects.filter(title='Test Film').exists()
        url = reverse('film-list')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK, f"No films without filters: {response.data}"
        assert len(response.data) == 1, f"Expected 1 film without filters, got {response.data}"
        response = self.client.get(url, {'search': 'Test'})
        assert response.status_code == status.HTTP_200_OK, f"Search failed: {response.data}"
        assert len(response.data) == 1, f"Expected 1 film with search, got {response.data}"
        assert response.data[0]['title'] == 'Test Film'

    def test_create_comment(self):
        """Проверка создания комментария"""
        url = reverse('comment-create', kwargs={'film_id': self.film.id})
        data = {'text': 'Great film!'}
        response = self.client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Comment.objects.filter(film=self.film, user=self.user).exists()
        assert response.data['text'] == 'Great film!'

    def test_create_rating(self):
        """Проверка создания рейтинга"""
        url = reverse('rating-list-create', kwargs={'film_id': self.film.id})
        data = {'rating': 4.5, 'comment': 'Good movie', 'film_id': self.film.id}
        response = self.client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Rating.objects.filter(film=self.film, user=self.user, rating=4.5).exists()

    def test_update_another_user_comment(self):
        """Проверка запрета редактирования чужого комментария"""
        other_user = User.objects.create_user(username='otheruser', password='otherpass123')
        comment = Comment.objects.create(user=other_user, film=self.film, text='Other comment')
        url = reverse('comment-update-delete', kwargs={'film_id': self.film.id, 'comment_id': comment.id})
        data = {'text': 'Trying to edit'}
        response = self.client.put(url, data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data['detail'] == 'Вы не можете редактировать чужой комментарий.'

@pytest.mark.django_db
class TestStreaming(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpassword123')
        self.token = RefreshToken.for_user(self.user)
        self.film = Film.objects.create(
            title='Test Film',
            description='Test Description',
            release_date='2023-01-01',
            duration=120,
            video=SimpleUploadedFile('test.mp4', b'file_content', content_type='video/mp4')
        )
        self.video_path = os.path.join(settings.MEDIA_ROOT, 'films/videos/test.mp4')
        os.makedirs(os.path.dirname(self.video_path), exist_ok=True)
        with open(self.video_path, 'wb') as f:
            f.write(b'file_content')

    def tearDown(self):
        if os.path.exists(self.video_path):
            os.remove(self.video_path)

    def test_stream_video_with_valid_token(self):
        """Проверка стриминга видео с валидным токеном"""
        url = reverse('stream_video', kwargs={'video_id': self.film.id}) + f'?token={self.token.access_token}'
        headers = {'HTTP_REFERER': 'http://localhost:3000'}
        response = self.client.get(url, **headers)
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'video/mp4'
        assert response['X-Watermark-Text'] == f'u{self.user.id}'

    def test_stream_video_invalid_referer(self):
        """Проверка запрета стриминга с неверным Referer"""
        url = reverse('stream_video', kwargs={'video_id': self.film.id}) + f'?token={self.token.access_token}'
        headers = {'HTTP_REFERER': 'http://malicious.com'}
        response = self.client.get(url, **headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        response_data = response.json()
        assert response_data['error'] == 'Доступ запрещён'

    def test_stream_video_nonexistent_file(self):
        """Проверка обработки несуществующего видеофайла"""
        os.remove(self.video_path)
        url = reverse('stream_video', kwargs={'video_id': self.film.id}) + f'?token={self.token.access_token}'
        headers = {'HTTP_REFERER': 'http://localhost:3000'}
        response = self.client.get(url, **headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        response_data = response.json()
        assert response_data['error'] == 'Видеофайл не найден'

    def test_stream_video_head_request(self):
        """Проверка HEAD-запроса для стриминга"""
        url = reverse('stream_video', kwargs={'video_id': self.film.id}) + f'?token={self.token.access_token}'
        headers = {'HTTP_REFERER': 'http://localhost:3000'}
        response = self.client.head(url, **headers)
        assert response.status_code == status.HTTP_200_OK
        assert response['X-Watermark-Text'] == f'u{self.user.id}'
        assert response['Content-Type'] == 'video/mp4'

@pytest.mark.django_db
class TestSecurity(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpassword123')
        self.token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token.access_token}')
        self.film = Film.objects.create(
            title='Test Film',
            description='Test Description',
            release_date='2023-01-01',
            duration=120,
            video=SimpleUploadedFile('test.mp4', b'file_content', content_type='video/mp4')
        )

    def test_sql_injection_protection(self):
        """Проверка защиты от SQL-инъекций"""
        url = reverse('film-list') + '?search=Test OR 1=1'
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) <= Film.objects.count()

    def test_xss_protection_in_comment(self):
        """Проверка защиты от XSS в комментариях"""
        url = reverse('comment-create', kwargs={'film_id': self.film.id})
        data = {'text': '<script>alert("xss")</script>'}
        response = self.client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        comment = Comment.objects.get(film=self.film, user=self.user)
        assert '<script>' not in comment.text
        assert comment.text == 'alert("xss")'

    def test_csp_report_logging(self):
        """Проверка логирования CSP-нарушений"""
        with patch('logging.Logger.warning') as mock_logger:
            url = reverse('csp_report')
            data = {'csp-report': {'document-uri': 'http://localhost', 'violated-directive': 'script-src'}}
            response = self.client.post(url, data, content_type='application/json')
            assert response.status_code == status.HTTP_200_OK
            mock_logger.assert_called()
            assert 'CSP нарушение' in str(mock_logger.call_args)

@pytest.mark.django_db
class TestLogging(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpassword123')
        self.film = Film.objects.create(
            title='Test Film',
            description='Test Description',
            release_date='2023-01-01',
            duration=120,
            video=SimpleUploadedFile('test.mp4', b'file_content', content_type='video/mp4')
        )
        self.video_path = os.path.join(settings.MEDIA_ROOT, 'films/videos/test.mp4')
        os.makedirs(os.path.dirname(self.video_path), exist_ok=True)
        with open(self.video_path, 'wb') as f:
            f.write(b'file_content')

    def tearDown(self):
        if os.path.exists(self.video_path):
            os.remove(self.video_path)

    def test_logging_invalid_referer(self):
        """Проверка логирования неверного Referer"""
        with patch.object(logging.getLogger('django.request'), 'warning') as mock_logger:
            url = reverse('stream_video', kwargs={'video_id': self.film.id})
            headers = {'HTTP_REFERER': 'http://malicious.com'}
            response = self.client.get(url, **headers)
            assert response.status_code == status.HTTP_403_FORBIDDEN
            mock_logger.assert_called()
            assert 'Forbidden' in str(mock_logger.call_args)

pytest_plugins = ['pytest_django']