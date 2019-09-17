debug:
	rsync -av --exclude=.git ./src/ ~/.local/share/gnome-shell/extensions/Gold_Price_Monitor@wotmshuaisi_github && gnome-shell-extension-tool -r Gold_Price_Monitor@wotmshuaisi_github && gnome-shell-extension-prefs

clean:
	rm -rf ~/.local/share/gnome-shell/extensions/Gold_Price_Monitor@wotmshuaisi_github && gnome-shell-extension-tool -d Gold_Price_Monitor@wotmshuaisi_github

install:
	rsync -av --exclude=.git ./src/ ~/.local/share/gnome-shell/extensions/Gold_Price_Monitor@wotmshuaisi_github && gnome-shell-extension-tool -e Gold_Price_Monitor@wotmshuaisi_github

build:
	rm -rf Gold_Price_Monitor@wotmshuaisi_github.zip
	cd src && zip -qr ../Gold_Price_Monitor@wotmshuaisi_github.zip . && cd ..
