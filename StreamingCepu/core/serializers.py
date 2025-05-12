from rest_framework import serializers
from .models import User, Film, Genre, Comment, WatchHistory, Rating, FilmGenre
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import User
import re
from django.utils import timezone
from .models import UserProfile
from django.db.models import Avg  
import logging
logger = logging.getLogger(__name__)  


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['username', 'first_name', 'last_name', 'email', 'avatar']

class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(source="profile.avatar", required=False)
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'date_joined', 'is_active', 'last_login', 'avatar']
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        avatar = profile_data.get('avatar', None)
        # Обновляем основные данные пользователя
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Обновляем пароль, если передан
        password = validated_data.get('password', None)
        if password:
            instance.set_password(password)

        # Обновляем или создаем профиль пользователя
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if avatar:
            profile.avatar = avatar
            profile.save()

        instance.save()
        return instance

class RatingSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    avatar = serializers.SerializerMethodField()
    film_id = serializers.IntegerField()
    film_title = serializers.CharField(source="film.title", read_only=True)
    film_poster = serializers.ImageField(source="film.image", read_only=True)

    class Meta:
        model = Rating
        fields = ['id', 'film_id', 'film_title', 'film_poster', 'user_id', 'username', 'avatar', 'rating', 'comment', 'rated_at']

    def get_avatar(self, obj):
        profile = getattr(obj.user, 'profile', None)
        if profile and profile.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(profile.avatar.url)
            return profile.avatar.url
        return None  

    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Пользователь не аутентифицирован")

        film_id = validated_data.pop('film_id')
        try:
            film = Film.objects.get(id=film_id)
        except Film.DoesNotExist:
            raise serializers.ValidationError("Фильм с указанным ID не существует")

        rating = Rating.objects.create(
            film=film,
            user=request.user,
            **validated_data
        )
        return rating

    def update(self, instance, validated_data):
        if 'film_id' in validated_data:
            film_id = validated_data.pop('film_id')
            try:
                film = Film.objects.get(id=film_id)
                instance.film = film
            except Film.DoesNotExist:
                raise serializers.ValidationError("Фильм с указанным ID не существует")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.rated_at = timezone.now()
        instance.save()
        return instance


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = '__all__'

class FilmSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    reviews = RatingSerializer(many=True, read_only=True, source='rating_set')
    average_rating = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()

    class Meta:
        model = Film
        fields = '__all__'

    def get_average_rating(self, obj):
        avg = obj.rating_set.aggregate(Avg('rating'))['rating__avg']
        return round(avg, 2) if avg is not None else None

    def get_video_url(self, obj):
        request = self.context.get('request')
        if request:
            # Формируем URL с query-параметром token
            token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
            if not token:
                logger.warning("Токен отсутствует в заголовке Authorization")
            url = request.build_absolute_uri(f'/api/films/{obj.id}/stream/')
            if token:
                url += f'?token={token}'
            logger.info(f"Сгенерирован video_url для film_id={obj.id}: {url}")
            return url
        logger.warning("Request отсутствует в контексте сериализатора")
        return None

class FilmGenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = FilmGenre
        fields = ['film', 'genre']

class CommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'user', 'username', 'avatar', 'film', 'text', 'created_at']
        read_only_fields = ['id', 'created_at', 'username', 'avatar']  # Убрали 'user'

    def get_avatar(self, obj):
        profile = getattr(obj.user, 'profile', None)
        if profile and profile.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(profile.avatar.url)
            return profile.avatar.url
        return None

class WatchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WatchHistory
        fields = '__all__'

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Пароли не совпадают."})
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_username(self, value):
        if not re.match(r'^[a-zA-Z0-9.@+-]+$', value):
            raise serializers.ValidationError("Имя пользователя должно содержать только латинские буквы, цифры и символы .@+-")
        return value

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Пароли не совпадают!")
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user
