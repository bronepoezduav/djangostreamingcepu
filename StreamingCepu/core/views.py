from django.shortcuts import render, get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework import generics, viewsets, status
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import api_view
from django.core.files.base import ContentFile
from .models import Film, Genre, Comment, WatchHistory, Rating
from .serializers import UserSerializer, FilmSerializer, GenreSerializer, CommentSerializer, WatchHistorySerializer, RatingSerializer, RegisterSerializer, ProfileSerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
import logging, os, requests, jwt
from django.db.models import Avg, F
from django.conf import settings
from django.core.files.storage import default_storage
from axes.handlers.proxy import AxesProxyHandler
from axes.helpers import get_client_str  
from axes.models import AccessAttempt 
from django.http import JsonResponse, HttpResponse, StreamingHttpResponse
from rest_framework_simplejwt.tokens import RefreshToken
from django.http import StreamingHttpResponse
from django.conf import settings
from moviepy.editor import VideoFileClip, TextClip
from moviepy.video.fx import all as vfx
from rest_framework_simplejwt.tokens import AccessToken  
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip  
from django.views.decorators.csrf import csrf_exempt


logger = logging.getLogger(__name__)  


@csrf_exempt
def csp_report(request):
    """Логирование CSP-нарушений."""
    if request.method == 'POST':
        try:
            report = request.body.decode('utf-8')
            logger.warning(f"CSP нарушение: {report}")
            return JsonResponse({"status": "reported"}, status=200)
        except Exception as e:
            logger.error(f"Ошибка обработки CSP-отчёта: {str(e)}")
            return JsonResponse({"error": "Invalid report"}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)

def stream_video(request, video_id):
    logger.info(f"Запрос стриминга: video_id={video_id}, метод={request.method}")
    
    referer = request.META.get('HTTP_REFERER', '')
    if not referer.startswith('http://localhost:3000'):
        logger.warning(f"Недопустимый Referer: {referer}")
        return JsonResponse({"error": "Доступ запрещён"}, status=403)

    film = get_object_or_404(Film, id=video_id)
    video_path = film.video.path
    logger.info(f"Путь к видео: {video_path}")

    token = request.GET.get('token')
    logger.info(f"Получен токен: {token}")
    watermark_text = "fu"
    if token:
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            watermark_text = f"u{user_id}"
            logger.info(f"Токен валиден, user_id={user_id}")
        except Exception as e:
            logger.error(f"Ошибка валидации токена: {str(e)}, тип: {type(e).__name__}")
            watermark_text = "fu"

    if not os.path.exists(video_path):
        logger.error(f"Файл не найден: {video_path}")
        return JsonResponse({"error": "Видеофайл не найден"}, status=404)

    if request.method == 'HEAD':
        response = HttpResponse(status=200)
        response['X-Watermark-Text'] = watermark_text
        response['Content-Type'] = 'video/mp4'
        logger.info(f"HEAD ответ, X-Watermark-Text: {watermark_text}")
        return response

    def stream_file():
        with open(video_path, 'rb') as f:
            while chunk := f.read(1024 * 1024):
                yield chunk
        logger.info(f"Стриминг video_id={video_id} завершен")

    response = StreamingHttpResponse(stream_file(), content_type='video/mp4')
    response['Content-Disposition'] = f'inline; filename="{film.title}.mp4"'
    response['Accept-Ranges'] = 'bytes'
    response['X-Watermark-Text'] = watermark_text
    logger.info(f"GET ответ, X-Watermark-Text: {watermark_text}")
    return response

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        recaptcha_response = request.data.get('recaptcha_token')
        if not recaptcha_response:
            logger.warning("reCAPTCHA токен отсутствует")
            return JsonResponse(
                {'error': 'Пожалуйста, пройдите проверку reCAPTCHA'},
                status=status.HTTP_400_BAD_REQUEST
            )

        recaptcha_verify = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': settings.RECAPTCHA_PRIVATE_KEY,
                'response': recaptcha_response,
                'remoteip': request.META.get('REMOTE_ADDR')
            }
        ).json()

        if not recaptcha_verify.get('success') or recaptcha_verify.get('score', 0.0) < 0.5:
            logger.warning(f"reCAPTCHA v3 проверка не пройдена: {recaptcha_verify}")
            return JsonResponse(
                {'error': 'Подозрение на бота! Попробуйте снова.', 'recaptcha_score': recaptcha_verify.get('score', 0.0)},
                status=status.HTTP_400_BAD_REQUEST
            )

        logger.info(f"reCAPTCHA v3 результат: {recaptcha_verify}")
        credentials = {
            'username': request.data.get('username', ''),
            'ip_address': request.META.get('REMOTE_ADDR', ''),
        }
        logger.debug(f"Axes: Проверка блокировки для {credentials}")

        client_str = get_client_str(
            username=credentials['username'],
            ip_address=credentials['ip_address'],
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            path_info=request.path,
            request=request
        )
        attempts = AccessAttempt.objects.filter(
            username=credentials['username'],
            ip_address=credentials['ip_address']
        )
        if attempts.exists() and attempts.first().failures_since_start >= 5:
            logger.info(f"Axes: Блокировка сработала для {credentials}")
            return lockout_response(request, credentials)

        try:
            response = super().post(request, *args, **kwargs)
            response.data['recaptcha_score'] = recaptcha_verify.get('score', 0.0)
            return response
        except Exception as e:
            attempts = AccessAttempt.objects.filter(
                username=credentials['username'],
                ip_address=credentials['ip_address']
            )
            if attempts.exists() and attempts.first().failures_since_start >= 5:
                logger.info(f"Axes: Блокировка сработала после ошибки SimpleJWT для {credentials}")
                return lockout_response(request, credentials)
            logger.error(f"Axes: Ошибка входа для {credentials}: {str(e)}")
            raise e

def lockout_response(request, credentials, *args, **kwargs):
    logger.info(f"Axes: lockout_response вызван для {credentials}")
    return JsonResponse(
        {'error': 'Слишком много попыток входа. Попробуйте снова через час.'},
        status=403
    )

@api_view(['POST'])
def register(request):
    if request.method == 'POST':
        recaptcha_response = request.data.get('recaptcha_token')
        if not recaptcha_response:
            logger.warning("reCAPTCHA токен отсутствует")
            return Response(
                {'error': 'Пожалуйста, пройдите проверку reCAPTCHA'},
                status=status.HTTP_400_BAD_REQUEST
            )

        recaptcha_verify = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': settings.RECAPTCHA_PRIVATE_KEY,
                'response': recaptcha_response,
                'remoteip': request.META.get('REMOTE_ADDR')
            }
        ).json()

        if not recaptcha_verify.get('success') or recaptcha_verify.get('score', 0.0) < 0.5:
            logger.warning(f"reCAPTCHA v3 проверка не пройдена: {recaptcha_verify}")
            return Response(
                {'error': 'Подозрение на бота! Попробуйте снова.', 'recaptcha_score': recaptcha_verify.get('score', 0.0)},
                status=status.HTTP_400_BAD_REQUEST
            )

        logger.info(f"reCAPTCHA v3 результат: {recaptcha_verify}")
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            logger.info(f"Пользователь {user.username} успешно зарегистрирован")
            return Response(
                {
                    "message": "Регистрация успешна!",
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "recaptcha_score": recaptcha_verify.get('score', 0.0)
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserAvatarUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    def put(self, request):
        user = request.user
        profile = user.profile
        avatar = request.FILES.get("avatar")
        if avatar:
            if profile.avatar and profile.avatar.name != "avatars/default.png":
                old_avatar_path = os.path.join(settings.MEDIA_ROOT, profile.avatar.name)
                if os.path.exists(old_avatar_path):
                    os.remove(old_avatar_path)
            profile.avatar = avatar
            profile.save()
            return Response({"avatar": profile.avatar.url}, status=status.HTTP_200_OK)
        return Response({"error": "Файл не передан"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.user
        profile = user.profile

        if profile.avatar and profile.avatar.name != "avatars/default.png":
            avatar_path = os.path.join(settings.MEDIA_ROOT, profile.avatar.name)
            if os.path.exists(avatar_path):
                os.remove(avatar_path)

        profile.avatar = "avatars/default.png"
        profile.save()
        
        return Response({"avatar": profile.avatar.url}, status=status.HTTP_200_OK)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ограничиваем доступ только к текущему пользователю
        return User.objects.filter(id=self.request.user.id)

    def perform_update(self, serializer):
        # Для обновления пароля в случае изменения пароля
        user = serializer.save()
        password = self.request.data.get("password", None)
        if password:
            user.set_password(password)
            user.save()

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]  # Требует аутентификации

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(UserSerializer(user).data)

    def put(self, request):
        user = request.user
        data = request.data

        for field in ["username", "first_name", "last_name", "email"]:
            if field in data:
                setattr(user, field, data[field])

        user.save()
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        profile = user.profile

        avatar = request.FILES.get("avatar")
        if avatar:
            profile.avatar = avatar
            profile.save()
            return Response({"avatar": profile.avatar.url}, status=status.HTTP_200_OK)

        return Response({"error": "Файл не передан"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        """Удаляет аватар, заменяя его на стандартный"""
        user_profile = request.user.profile
        if user_profile.avatar:
            user_profile.avatar.delete(save=True)  # Удаляем текущий аватар
            user_profile.avatar = 'avatars/default.png'  # Ставим дефолтный
            user_profile.save()
            logger.info(f"Аватар пользователя {request.user.username} удален")
            return Response({"avatar": user_profile.avatar.url}, status=status.HTTP_200_OK)

        return Response({"error": "Аватар отсутствует"}, status=status.HTTP_400_BAD_REQUEST)

class UserReviewsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        reviews = Rating.objects.filter(user_id=user_id)
        serializer = RatingSerializer(reviews, many=True, context={'request': request})
        return Response(serializer.data)
        

class FilmViewSet(viewsets.ModelViewSet):
    queryset = Film.objects.all()
    serializer_class = FilmSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['genres', 'duration']
    search_fields = ['title']

    def get_queryset(self):
        queryset = super().get_queryset()
        duration = self.request.query_params.get('duration__lte')
        if duration:
            queryset = queryset.filter(duration__lte=duration)
        genres = self.request.query_params.get('genres')
        if genres:
            genre_list = genres.split(',')
            queryset = queryset.filter(genres__name__in=genre_list).distinct()
        queryset = queryset.annotate(avg_rating=Avg('rating_set__rating'))
        ordering = self.request.query_params.get('ordering', None)

        if ordering == 'average_rating':
            queryset = queryset.order_by('avg_rating')
        elif ordering == '-average_rating':
            queryset = queryset.order_by('-avg_rating')

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class GenreViewSet(viewsets.ModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer

class GenreListView(generics.ListAPIView):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer

class CommentCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, film_id):
        logger.info(f"Пользователь: {request.user}, ID: {request.user.id}")
        logger.info(f"Входные данные: {request.data}")
        data = request.data.copy()
        data['film'] = film_id
        # Если 'user' не передан с фронта, используем request.user.id
        if 'user' not in data:
            data['user'] = request.user.id
        logger.info(f"Финальные данные перед сериализатором: {data}")
        serializer = CommentSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            instance = serializer.save()
            logger.info(f"Комментарий сохранён: ID={instance.id}, user_id={instance.user.id}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.error(f"Ошибка валидации: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CommentUpdateDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, comment_id):
        try:
            return Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return None

    def put(self, request, film_id, comment_id):
        comment = self.get_object(comment_id)
        if not comment:
            return Response({"detail": "Комментарий не найден."}, status=status.HTTP_404_NOT_FOUND)
        if comment.user != request.user:
            return Response({"detail": "Вы не можете редактировать чужой комментарий."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CommentSerializer(comment, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, film_id, comment_id):
        comment = self.get_object(comment_id)
        if not comment:
            return Response({"detail": "Комментарий не найден."}, status=status.HTTP_404_NOT_FOUND)
        if comment.user != request.user:
            return Response({"detail": "Вы не можете удалить чужой комментарий."}, status=status.HTTP_403_FORBIDDEN)

        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class CommentListView(APIView):
    def get(self, request, film_id):
        comments = Comment.objects.filter(film_id=film_id).order_by('-created_at')
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
        
class RatingListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, film_id):
        logger.info(f"Получен запрос на получение отзывов для фильма {film_id}")
        ratings = Rating.objects.filter(film_id=film_id)
        serializer = RatingSerializer(ratings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, film_id):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        data = request.data.copy()
        data["film"] = film_id  # Используем "film", если в модели так названо
        data["user"] = request.user.id  

        logger.info(f"Финальные данные перед сериализатором: {data}")

        serializer = RatingSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"Ошибка валидации рейтинга: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RatingUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, film_id, id):
        try:
            return Rating.objects.get(film_id=film_id, id=id)
        except Rating.DoesNotExist:
            return None

    def put(self, request, film_id, id):
        rating = self.get_object(film_id, id)
        if not rating:
            return Response({"detail": "Отзыв не найден."}, status=status.HTTP_404_NOT_FOUND)

        if rating.user != request.user:
            return Response({"detail": "Вы не можете редактировать чужие отзывы."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        data["film"] = film_id
        data["user"] = request.user.id  


        logger.info(f"Данные запроса: {data}")  
        serializer = RatingSerializer(rating, data=data, context={'request': request}, partial=False)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        logger.error(f"Ошибки сериализатора: {serializer.errors}")  
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RatingDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, film_id, id):
        try:
            # Находим отзыв по film_id и id
            rating = Rating.objects.get(id=id, film_id=film_id, user=request.user)
            rating.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Rating.DoesNotExist:
            return Response(
                {"detail": "Отзыв не найден или у вас нет прав на его удаление."},
                status=status.HTTP_404_NOT_FOUND
            )

class WatchHistoryViewSet(viewsets.ModelViewSet):
    queryset = WatchHistory.objects.all()
    serializer_class = WatchHistorySerializer

class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": "Ты авторизован!"})

