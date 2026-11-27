@echo off
SET NODE=C:\Users\Admin\AppData\Local\ms-playwright-go\1.57.0\node.exe
SET NPM=C:\tmp\npm-extracted\package\bin\npm-cli.js
SET CACHE=C:\tmp\npm-cache

cd /d "E:\individual project\benefitbridge"

echo.
echo ============================================
echo  BenefitBridge - Installing dependencies
echo ============================================
echo.

%NODE% %NPM% install --loglevel=error --cache=%CACHE%

echo.
echo ============================================
echo  Install complete. Starting dev server...
echo ============================================
echo.

%NODE% %NPM% run dev
