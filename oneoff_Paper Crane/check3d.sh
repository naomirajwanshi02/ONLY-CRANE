#!/bin/sh
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
P="file:///D:/Anatomy/STR/News/oneoff_Paper%20Crane/crane3d.html"
for t in "$@"; do
  "$CH" --headless=new --hide-scrollbars --allow-file-access-from-files --enable-unsafe-swiftshader --use-angle=swiftshader --window-size=540,960 --virtual-time-budget=8000 --enable-logging=stderr --v=0 --screenshot="D:\Anatomy\STR\News\oneoff_Paper Crane\check\g$t.png" "$P?t=$t" 2>&1 | grep "CONSOLE" | cut -c1-600 | head -6
done
