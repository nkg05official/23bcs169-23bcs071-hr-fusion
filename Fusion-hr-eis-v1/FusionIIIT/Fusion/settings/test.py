from Fusion.settings.common import *

SECRET_KEY = "test-secret-key"
DEBUG = False
ALLOWED_HOSTS = ["*"]
ROOT_URLCONF = "Fusion.settings.test_urls"
USE_TZ = True

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "rest_framework",
    "rest_framework.authtoken",
    "applications.eis",
    "applications.establishment",
    "applications.globals",
    "applications.filetracking",
    "applications.hr2",
]

MIDDLEWARE = []

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"

MIGRATION_MODULES = {
    "eis": None,
    "establishment": None,
    "filetracking": None,
    "globals": None,
    "hr2": None,
}
