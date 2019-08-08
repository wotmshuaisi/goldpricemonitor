debug:
	rsync -av --exclude=.git ./src/ ~/.local/share/gnome-shell/extensions/Gold_Price_Monitor@wotmshuaisi_github && gnome-shell-extension-tool -r Gold_Price_Monitor@wotmshuaisi_github && gnome-shell-extension-prefs

clean:
	rm -rf ~/.local/share/gnome-shell/extensions/Gold_Price_Monitor@wotmshuaisi_github

build:
	cd src && zip -qrj ../Gold_Price_Monitor@wotmshuaisi_github.zip . && cd ..
