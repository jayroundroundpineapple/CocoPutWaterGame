@echo off
chcp 65001 >nul

REM Get the directory where the batch file is located
set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%"

REM Change to application directory
cd /d "%APP_DIR%"

REM Check if JAR file exists
set "JAR_FILE=SecretJS.jar"
if not exist "%JAR_FILE%" (
    echo ERROR: Cannot find %JAR_FILE% in %APP_DIR%
    pause
    exit /b 1
)

REM Try to find Java executable
REM First, check if java is in system PATH
where java >nul 2>&1
if %errorlevel% equ 0 (
    echo Using system Java
    java -version
    goto :run_with_system_java
)

REM If not found in PATH, try to use local jre folder
if exist "%APP_DIR%jre\bin\java.exe" (
    echo Using local JRE: %APP_DIR%jre\bin\java.exe
    "%APP_DIR%jre\bin\java.exe" -version
    goto :run_with_local_jre
)

REM Java not found anywhere
echo ERROR: Java not found in system PATH and no local jre folder found.
echo Please install Java 8 or higher, or place a jre folder in the application directory.
pause
exit /b 1

:run_with_system_java
REM Create necessary directories
if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "web_cache" mkdir web_cache
if not exist "jcef-bundle" mkdir jcef-bundle

REM Start application with system Java
echo Starting application...
java -jar "%JAR_FILE%"
goto :check_exit_code

:run_with_local_jre
REM Create necessary directories
if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "web_cache" mkdir web_cache
if not exist "jcef-bundle" mkdir jcef-bundle

REM Start application with local JRE
echo Starting application...
"%APP_DIR%jre\bin\java.exe" -jar "%JAR_FILE%"
goto :check_exit_code

:check_exit_code
if %errorlevel% neq 0 (
    echo Application exited with error code: %errorlevel%
    pause
)
