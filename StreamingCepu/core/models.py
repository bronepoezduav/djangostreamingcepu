from django.db import models
from django.db.models import Avg
from django.contrib.auth.models import User  
from django.db.models.signals import post_save
from django.dispatch import receiver
from fernet_fields import EncryptedTextField

def default_avatar():
    return "avatars/default.png"  # путь к файлу внутри `MEDIA_ROOT`
    
def user_avatar_path(instance, filename):
    return f'avatars/user_{instance.user.id}/{filename}'

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to=user_avatar_path, default='avatars/default.png', null=True, blank=True)    

class Genre(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class Film(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    release_date = models.DateField()
    duration = models.IntegerField()
    image = models.ImageField(upload_to='films/', blank=True, null=True)

    # Старое поле: video = models.FileField(...)
    video = models.FileField(upload_to='films/videos/', blank=True, null=True)
    video_path_encrypted = EncryptedTextField(blank=True, null=True)

    genres = models.ManyToManyField('Genre', through='FilmGenre')

    def __str__(self):
        return self.title

    def average_rating(self):
        return self.film_ratings.aggregate(Avg('rating'))['rating__avg'] or 0.0

    def save(self, *args, **kwargs):
        if self.video and not self.video_path_encrypted:
            self.video_path_encrypted = self.video.name
        super().save(*args, **kwargs)

    def get_video_url(self):
        from django.conf import settings
        return f"{settings.MEDIA_URL}{self.video_path_encrypted}"


class FilmGenre(models.Model):
    film = models.ForeignKey(Film, on_delete=models.CASCADE)
    genre = models.ForeignKey(Genre, on_delete=models.CASCADE)


class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # Связь с моделью пользователя
    film = models.ForeignKey(Film, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Комментарий от {self.user} к фильму {self.film.title}"


class WatchHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # Связь с моделью пользователя
    film = models.ForeignKey(Film, on_delete=models.CASCADE)
    watched_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"История просмотра {self.user} для фильма {self.film.title}"


class Rating(models.Model):
    rating = models.DecimalField(max_digits=4, decimal_places=2)
    rated_at = models.DateTimeField(auto_now_add=True)
    film = models.ForeignKey(Film, on_delete=models.CASCADE, related_name="rating_set")
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=False)
    comment = models.TextField(default='')  # Пустая строка по умолчанию
    def __str__(self):
        return f"Оценка {self.rating} для фильма {self.film.title} от {self.user}"
