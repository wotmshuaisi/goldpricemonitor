debug:
	rsync -av --exclude=.git ./src/ ~/.local/share/gnome-shell/extensions/Gold_Price_Monitor@wotmshuaisi_github && busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting…")' && journalctl -f



clean:
	rm -rf ~/.local/share/gnome-shell/extensions/Gold_Price_Monitor@wotmshuaisi_github && gnome-extensions uninstall Gold_Price_Monitor@wotmshuaisi_github

install:
	rsync -av --exclude=.git ./src/ ~/.local/share/gnome-shell/extensions/Gold_Price_Monitor@wotmshuaisi_github && gnome-extensions enable Gold_Price_Monitor@wotmshuaisi_github

build:
	rm -rf Gold_Price_Monitor@wotmshuaisi_github.zip
	cd src && zip -qr ../Gold_Price_Monitor@wotmshuaisi_github.zip . && cd ..
