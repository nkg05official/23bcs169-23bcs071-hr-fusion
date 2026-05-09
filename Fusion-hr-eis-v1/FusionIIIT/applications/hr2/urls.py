from django.conf.urls import include, url


app_name = 'hr2'

urlpatterns = [
    url(r'^api/', include('applications.hr2.api.urls')),
]
