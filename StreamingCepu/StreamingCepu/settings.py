from pathlib import Path
from datetime import timedelta
import os

BASE_DIR = Path(__file__).resolve().parent.parent

MEDIA_URL = '/media/' 
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')  

SECRET_KEY = 'django-insecure-^hooipk+4a#6guee5rfp!c7ms$*redtmtglb2=ubw&mh!*p8)#'

DEBUG = True

ALLOWED_HOSTS = []

CORS_ALLOW_ALL_ORIGINS = True



INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework', 
    'core',  
    'rest_framework_simplejwt',
    "rest_framework.authtoken",
    "StreamingCepu",
    'django_filters',
    'axes',
    'csp'
    
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'corsheaders.middleware.CorsMiddleware',  
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'axes.middleware.AxesMiddleware',  
    
]
ROOT_URLCONF = 'StreamingCepu.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'StreamingCepu.wsgi.application'

AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesStandaloneBackend',  # Для блокировки
    'axes.backends.AxesBackend',  # Для JWT и стандартной аутентификации
    'django.contrib.auth.backends.ModelBackend',  # Стандартная аутентификация
]
AXES_ENABLED = True
AXES_FAILURE_LIMIT = 5  # 5 попыток
AXES_COOLOFF_TIME = 1  # Блокировка на 1 час
AXES_RESET_ON_SUCCESS = True
AXES_VERBOSE = True
AXES_LOCKOUT_CALLABLE = 'core.views.lockout_response'
AXES_USERNAME_FORM_FIELD = 'username'  # Поле username в запросе
AXES_LOCKOUT_PARAMETERS = [["username", "ip_address"]]  # Блокировка по комбинации username и ip_address

# Убедимся, что BASE_DIR указывает на корень проекта
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Создаём папку logs, если она не существует
LOG_DIR = os.path.join(BASE_DIR, 'logs')
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(LOG_DIR, 'app.log'),
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        '': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'StreamingCepuDB',        
        'USER': 'root',        
        'PASSWORD': '',  
        'HOST': 'localhost',          
        'PORT': '3306',              
    }
}

CONTENT_SECURITY_POLICY = {
    'DIRECTIVES': {
        'default-src': ["'self'"],
        'script-src': [
            "'self'",
            "http://localhost:3000",
            "'unsafe-inline'",  # Временно для React
        ],
        'style-src': [
            "'self'",
            "http://localhost:3000",
            "'unsafe-inline'",  # Временно для inline-стилей
        ],
        'img-src': ["'self'", "data:"],
        'media-src': ["'self'", "http://localhost:8000"],
        'connect-src': [
            "'self'",
            "http://localhost:8000",
            "http://localhost:3000",
        ],
        'report-uri': '/csp-report/',
    }
}
CONTENT_SECURITY_POLICY_REPORT_ONLY = True  # Тестируем без блокировки


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        'NAME': 'django_password_validators.password_character_requirements.password_validation.PasswordCharacterValidator',
        'OPTIONS': {
            'min_length_digit': 1,
            'min_length_alpha': 1,
            'min_length_special': 1,
            'min_length_lower': 1,
            'min_length_upper': 1,
            'special_characters': "!@#$%^&*()_+-=[]{}|;:,.<>?"
        }
    },
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',      
        'rest_framework.authentication.SessionAuthentication',  # для совместимости с Axes  
    ),
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    # 'PAGE_SIZE': 10,  # для пагинации
    
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),  
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),  
    "ROTATE_REFRESH_TOKENS": True,  
    "BLACKLIST_AFTER_ROTATION": True,  
}


RECAPTCHA_PUBLIC_KEY = '6LdzEDArAAAAABffNXSSMuqo20I3VW6S3m-EQvaJ'
RECAPTCHA_PRIVATE_KEY = '6LdzEDArAAAAACzFirvsGRd3ocq9mKD9DlI0BJjI'




LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
