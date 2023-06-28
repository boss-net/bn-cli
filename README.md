Bossnet CLI Tool
===========================
This is a command line application demonstrating various usages of the Bossnet API.


Setup
===========================
* Download the lastest [release](https://github.com/Bossnet-Labs/bn-cli/releases/latest) cli-{version}-{os}-{cpu architecture}.zip 
* Unzip the downloaded zip file


Windows
===========================
* Open Command Prompt
* Test
  * ```\path\to\bn.exe --help``` e.g. ```G:\bn.exe --help``` or 
  * ```cd \path\to\bn.exe``` followed by ```bn.exe --help```


Linux
===========================
* Open Linux Terminal
* Test
  *  ```/path/to/bn --help``` e.g. ```/apps/bn --help``` or 
  *  ```cd \path\to\bn``` followed by ```./bn --help```


Mac
===========================
* Open Mac Terminal
* Execute ```xattr -d com.apple.quarantine /path/to/bn``` to remove the quarantine bit.
* Execute ```chmod +x /path/to/bn``` to make the app executable.
* Test
  *  ```/path/to/bn --help``` e.g. ```/apps/bn --help``` or 
  *  ```cd \path\to\bn``` followed by ```./bn --help```

Compiling from source
===========================
* Ensure [deno](https://deno.land/#installation) is installed  
* Execute the commands below
```
deno bundle --unstable --import-map ./import_map.json ./bn.js ./bn.bundle.js
deno compile --allow-all --unstable --target x86_64-unknown-linux-gnu --output ./bn ./bn.bundle.js &
```

Example Commands
===========================
**Show command usage**

``./bn --help``

``./bn group --help``

``./bn export --help``

**Export Excel file**

``./bn export``

**Export PNG image**

``./bn export --format png``

*Note: Requires the [GraphViz](https://graphviz.gitlab.io) package to be [installed](https://graphviz.gitlab.io/download/#executable-packages) and available on your path.*

**List resources**

``./bn resource list``


**Import Groups, Remote Networks and resources into a new account**

``./bn import -a [new account name] -nrg -f [path to file to import from (format must be as outputted by the export command)]``

Need Help?
===========================
If you are experiencing any issues, create a new issue [here](https://github.com/Bossnet-Labs/bn-cli/issues/new).
