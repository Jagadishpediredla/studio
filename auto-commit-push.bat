@echo off
echo Starting auto commit and push process...

REM Add all changes
git add .

REM Create commit message with timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set YEAR=%dt:~0,4%
set MONTH=%dt:~4,2%
set DAY=%dt:~6,2%
set HOUR=%dt:~8,2%
set MIN=%dt:~10,2%
set SEC=%dt:~12,2%
set TIMESTAMP=%YEAR%-%MONTH%-%DAY% %HOUR%:%MIN%:%SEC%

git commit -m "Auto commit: Changes pushed at %TIMESTAMP%"

REM Push to remote repository
git push origin main

echo Auto commit and push completed successfully!
pause