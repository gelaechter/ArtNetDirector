
<!-- PROJECT LOGO -->
<p align="center">
  <a href="README.md">🇬🇧 English</a>
  &nbsp;
  <a href="README.de.md">🇩🇪 Deutsch</a>
  </br></br>
  <a href="https://github.com/gelaechter/ArtNetDirector">
    <img src="/src/main/resources/banner.png" alt="Logo" width="400">
  </a>

<h1 align="center">ArtNet Director</h1>

  <p align="center">
    A client-server based application for the selective redirection of Art-Net packets.
    <br />
    <a href="https://github.com/gelaechter/ArtNetDirector/wiki"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/gelaechter/ArtNetDirector/issues">Report Bug</a>
    ·
    <a href="https://github.com/gelaechter/ArtNetDirector/issues">Request Feature</a>
    ·
    <a href="https://github.com/gelaechter/ArtNetDirector/issues">Ask a Question</a>

  </p>
</p>

![ArtNet Director](./.github/preview.png)

## About The Project
ArtNet Director is a client-server based application, for the selective redirection of Art-Net packets.
Its main purpose is to facilitate switching between multiple users when restricted to a limited amount of Art-Net nodes.
It is operated using a web interface meaning it runs as a server on another computer, which can then be accessed by other computers in a local network using a web browser.

## Installation

You'll need [Java](https://java.com/en/download/) installed on your machine to run this application.

* Download the latest jar file from the releases
* Put the jar file in a new directory
* Run the jar file, e.g. by double clicking it or from your command line:
``` sh
java -jar ArtNetDirector.jar
```

In the console you'll find what to open in the web browser

### Building from Source
This project was built using the following things:
* [Java](https://java.com/en/download/)
* [Gradle](https://gradle.org/install/)
* [npm](https://www.npmjs.com/get-npm)


First, clone the repository and move into it:
``` shell
git clone https://github.com/gelaechter/ArtNetDirector
cd ArtNetDirector
```

Then install all npm packages, this also installs Webpack and TypeScript:
```sh
npm install
```

Run Webpack to transpile TypeScript files:
```sh
webpack --no-watch
```

Create a uber jar using Gradle:
```sh
./gradlew shadowJar
```

## Usage
1. You start the application on a computer.
2. You configure nodes, their IP addresses etc. in the web admin interface.
</br> (address is found in the applications console)
3. All users set their Art-Net output to the IP address of the host server.
</br> (address also found in the applications console)
4. The users can then toggle to which nodes they want to transmit their Art-Net packets in the web user interface.

_For more in-depth explanations refer to the [Documentation](https://github.com/gelaechter/ArtNetDirector/wiki)_

## Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See [LICENSE](https://github.com/gelaechter/ArtNetDirector/blob/master/LICENSE) for more information.

## Acknowledgements

* This project uses [Art-Net™](https://art-net.org.uk/) Designed by and Copyright Artistic Licence Holdings Ltd
* It also uses my fork of [artnet4j by cansik](https://github.com/cansik/artnet4j)
* Special thanks to my CS teacher who not only came up with the idea but let me work on it during lessons
