@rem Gradle startup script for Windows - uses Android Studio's bundled gradle-api
@if "%DEBUG%"=="" @echo off
set DIRNAME=%~dp0
set APP_HOME=%DIRNAME%
set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar
set JAVA_EXE=java.exe
%JAVA_EXE% -Xmx2048m -Xms256m -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
