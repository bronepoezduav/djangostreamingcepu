
from django.contrib import admin
from .models import Film, Genre, FilmGenre, Comment,WatchHistory, Rating

admin.site.register(Film)
admin.site.register(Genre)
admin.site.register(FilmGenre)
admin.site.register(Comment)
admin.site.register(WatchHistory)
admin.site.register(Rating)