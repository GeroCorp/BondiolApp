# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ✅ OPTIMIZACIONES DE MEMORIA Y RENDIMIENTO

# WebView con JS (necesario para Capacitor)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Mantener atributos para debugging en caso de crash
-keepattributes SourceFile,LineNumberTable

# Preservar clases de Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }

# Preservar clases de Ionic/Cordova
-keep class org.apache.cordova.** { *; }

# Optimización agresiva - eliminar código no usado
-dontobfuscate
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification

# Preservar enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ✅ Eliminación de logs en producción (ahorro de memoria)
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}

# ✅ Preservar componentes críticos del sistema
-keep class * extends java.lang.Exception

# Ocultar nombre del archivo original
-renamesourcefileattribute SourceFile
