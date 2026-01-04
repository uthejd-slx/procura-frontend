# Frontend

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.17.

## Development server

Run `ng serve --port 4210` for a dev server. Navigate to `http://localhost:4210/`. The application will automatically reload if you change any of the source files.
The frontend expects the backend at `http://localhost:8001/api` by default.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Release deploys

Release deployments are triggered by GitHub Releases (not pushes). Creating a release builds and pushes the Docker image and deploys to the DigitalOcean droplet.
See `DEPLOYMENT.md` for required secrets, server setup, and port notes.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
