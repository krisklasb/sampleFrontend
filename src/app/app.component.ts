import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule} from '@angular/router';
import { MsalService, MsalBroadcastService, MSAL_GUARD_CONFIG, MsalGuardConfiguration } from '@azure/msal-angular';
import { InteractionStatus, RedirectRequest, EventMessage, EventType } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: true,
    imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatMenuModule]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Angular Standalone Sample - MSAL Angular v3';
  isIframe = false;
  isAuthenticated = false;
  activeUser: String | undefined = ""; //Email die im Header displayed wird
  private readonly _destroying$ = new Subject<void>();

  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService
  ) {
    
  }

  ngOnInit(): void {
    this.authService.handleRedirectObservable().subscribe();

    this.isIframe = window !== window.parent && !window.opener; // Remove this line to use Angular Universal

    this.authService.instance.enableAccountStorageEvents(); // Optional - This will enable ACCOUNT_ADDED and ACCOUNT_REMOVED events emitted when a user logs in or out of another tab or window
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.ACCOUNT_ADDED || msg.eventType === EventType.ACCOUNT_REMOVED), //hört auf Account added/removed events
      )
      .subscribe((result: EventMessage) => {
        if (this.authService.instance.getAllAccounts().length === 0) {
          window.location.pathname = "/root"; //Wenn keine Accounts nach einem Remove vorhanden sind ein Redirect zu Root. Der Triggert wenn root mit MSALGuard protected ist ein Login
        } else {
          this.isAuthenticated=this.authService.instance.getAllAccounts().length > 0; //Hier bei Bedarf andere Logik. Stand jetzt: Wenn es mehr als 0 eingeloggte Accounts gibt ist er status eingloggt 
        }
      });
    
    this.msalBroadcastService.inProgress$ //MSAL führt etwas aus und sobald InteractionStatus.None ist also MSAL fertig ist wird nach einem aktiven Account gecheckt
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
        this.checkAndSetActiveAccount();
      })
  }


  checkAndSetActiveAccount(){
  
    /**
     * If no active account set but there are accounts signed in, sets first account to active account
     * To use active account set here, subscribe to inProgress$ first in your component
     * Note: Basic usage demonstrated. Your app may require more complicated account selection logic
     */
    let activeAccount = this.authService.instance.getActiveAccount(); //check ob active account

    if(!activeAccount && this.authService.instance.getAllAccounts().length > 0){ //Wenn nicht check ob es eingeloggte accounts gibt
      activeAccount = this.authService.instance.getAllAccounts()[0]; //Nimmt den ersten eingeloggten account und hinterlegt ihn als activeAccount für MSAL
      this.authService.instance.setActiveAccount(activeAccount);
    }

    this.isAuthenticated = !!activeAccount; //Wenn active Account user is authenticated
    this.activeUser = activeAccount?.username; //Wenn activeAccount dann wird der Name aktualisiert
  }



  login() {

      this.authService.loginRedirect({...this.msalGuardConfig.authRequest} as RedirectRequest);
  }



  logout() {
      this.authService.logoutRedirect();
    
  }

  ngOnDestroy(): void { //destroy der subscriptions wenn componente nicht mehr genutzt wird
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}