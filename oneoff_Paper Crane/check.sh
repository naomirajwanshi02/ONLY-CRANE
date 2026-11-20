#!/bin/sh
# usage: check.sh t1 t2 ... -> check/t<sec>.png ; prints console errors
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
P="file:///D:/Anatomy/STR/News/oneoff_Paper%20Crane/crane.html"
for t in "$@"; do
  "$CH" --headless=new --hide-scrollbars --allow-file-access-from-files --window-size=540,960 --virtual-time-budget=3000 --enable-logging=stderr --v=0 --screenshot="D:\Anatomy\STR\News\oneoff_Paper Crane\check\t$t.png" "$P?t=$t" 2>&1 | grep "CONSOLE" | grep -v "\"TL " | head -5
done
