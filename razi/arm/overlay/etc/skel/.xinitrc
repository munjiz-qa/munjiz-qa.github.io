#!/bin/sh
export LANG=ar_EG.UTF-8 LANGUAGE=ar:en
setxkbmap -layout us,ara -option grp:alt_shift_toggle
xsetroot -solid "#0B1E2D"
exec dbus-launch --exit-with-session icewm-session
