from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from rest_framework.routers import DefaultRouter
from core.views import (
    CustomTokenObtainPairView, register, CommentCreateView, CommentListView,
    CommentUpdateDeleteView, RatingListCreateView, RatingUpdateView, RatingDeleteView,
    UserProfileView, UserAvatarUpdateView, UserReviewsView, FilmViewSet, GenreViewSet, WatchHistoryViewSet
)
from axes.handlers.proxy import AxesProxyHandler
from django.urls import path
router = DefaultRouter()
router.register(r'films', FilmViewSet)
router.register(r'genres', GenreViewSet)
router.register(r'watch-history', WatchHistoryViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    # Токены
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    path('api/register/', register, name='register'),

    # Комментарии
    path('api/films/<int:film_id>/comments/', CommentCreateView.as_view(), name='comment-create'),
    path('api/films/<int:film_id>/comments/list/', CommentListView.as_view(), name='comment-list'),
    path('api/comments/<int:comment_id>/', CommentUpdateDeleteView.as_view(), name='comment-update-delete'),
    path('api/films/<int:film_id>/comments/<int:comment_id>/', CommentUpdateDeleteView.as_view(), name='comment-update-delete'),

    # Рейтинги
    path('films/<int:film_id>/ratings/', RatingListCreateView.as_view(), name='rating-list-create'),
    path('films/<int:film_id>/ratings/<int:id>/', RatingUpdateView.as_view(), name='rating-update'),
    path('films/<int:film_id>/ratings/<int:id>/delete/', RatingDeleteView.as_view(), name='rating-delete'),

    # Профиль
    path('api/profile/', UserProfileView.as_view(), name='user-profile'),
    path('api/profile/avatar/', UserAvatarUpdateView.as_view(), name='profile-avatar'),
    path('api/user/<int:user_id>/reviews/', UserReviewsView.as_view(), name='user-reviews'),

    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)