[ -f ~/.bashrc ] && . ~/.bashrc
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then exec startx -- -nolisten tcp >/tmp/razi-x.log 2>&1; fi
