import { mergeApplicationConfig } from '@angular/core';
import { bootstrapApplication, provideClientHydration } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

const browserConfig = mergeApplicationConfig(appConfig, {
  providers: [provideClientHydration()],
});

bootstrapApplication(AppComponent, browserConfig).catch((err) =>
  console.error(err)
);
