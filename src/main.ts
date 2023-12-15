import { enableProdMode, importProvidersFrom } from '@angular/core';
import { HTTP_INTERCEPTORS, withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { Route, provideRouter, withDisabledInitialNavigation, withEnabledBlockingInitialNavigation } from '@angular/router';
import { MsalInterceptor, MSAL_INSTANCE, MsalInterceptorConfiguration, MsalGuardConfiguration, MSAL_GUARD_CONFIG, MSAL_INTERCEPTOR_CONFIG, MsalService, MsalGuard, MsalBroadcastService } from '@azure/msal-angular';
import { IPublicClientApplication, PublicClientApplication, InteractionType, BrowserCacheLocation, LogLevel, BrowserUtils } from '@azure/msal-browser';
import { AppComponent } from './app/app.component';
import { HomeComponent } from './app/home/home.component';
import { FailedComponent } from './app/failed/failed.component';
import { environment } from './environments/environment';

export function loggerCallback(logLevel: LogLevel, message: string) {
    console.log(message);
}


//npm install @azure/msal-browser @azure/msal-angular


export function MSALInstanceFactory(): IPublicClientApplication {
    return new PublicClientApplication({
      auth: {
        clientId: environment.msalConfig.auth.clientId,
        authority: environment.msalConfig.auth.authority,
        redirectUri: '/root', //Nach dem Login
        postLogoutRedirectUri: '/root'
      },
      cache: {
        cacheLocation: BrowserCacheLocation.LocalStorage //Speichert Tokens etc im localStorage
      },
      system: {
        allowNativeBroker: false, // Disables WAM Broker
        loggerOptions: {
          loggerCallback,
          logLevel: LogLevel.Info, //Logged im Konsolen Browser alle MSAL ereignisse
          piiLoggingEnabled: false
        }
      }
    });
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
    const protectedResourceMap = new Map<string, Array<string>>();
    protectedResourceMap.set(environment.apiConfig.uri, environment.apiConfig.scopes); //Interceptor hinterlegt für requests an apiConfig.uri jwt in den req header
  
    return {
      interactionType: InteractionType.Redirect,
      protectedResourceMap
    };
  }
  
  export function MSALGuardConfigFactory(): MsalGuardConfiguration {
    return { 
      interactionType: InteractionType.Redirect,
      authRequest: {
        scopes: [...environment.apiConfig.scopes]
      },
      loginFailedRoute: '/login-failed'
    };
}

const initialNavigation = !BrowserUtils.isInIframe() && !BrowserUtils.isInPopup() 
    ? withEnabledBlockingInitialNavigation() // Set to enabledBlocking to use Angular Universal
    : withDisabledInitialNavigation(); 

export const Routes: Route[] = [
    {
        path: 'root',
        //path: '',
        component: HomeComponent,
        canActivate: [MsalGuard] //Protected diese Route und zwingt User zum Login via SSO
    },
    {
        path: 'login-failed',
        component: FailedComponent
    }
    ];

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, MatButtonModule, MatToolbarModule, MatListModule, MatMenuModule),
        provideRouter(Routes, initialNavigation),
        provideNoopAnimations(),
        provideHttpClient(withInterceptorsFromDi()),
        {
            provide: HTTP_INTERCEPTORS,
            useClass: MsalInterceptor,
            multi: true
        },
        {
            provide: MSAL_INSTANCE,
            useFactory: MSALInstanceFactory
        },
        {
            provide: MSAL_GUARD_CONFIG,
            useFactory: MSALGuardConfigFactory
        },
        {
            provide: MSAL_INTERCEPTOR_CONFIG,
            useFactory: MSALInterceptorConfigFactory
        },
        MsalService,
        MsalGuard,
        MsalBroadcastService
    ]
})
  .catch(err => console.error(err));