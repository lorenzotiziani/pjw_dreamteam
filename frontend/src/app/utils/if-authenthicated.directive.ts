import { Directive, inject, OnDestroy, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Directive({
  selector: '[ifAuthenticated]',
  standalone: false
})
export class IfAuthenticatedDirective implements OnInit, OnDestroy {

  protected authSrv = inject(AuthService);
  protected viewContainer = inject(ViewContainerRef);
  protected templatedRef = inject<TemplateRef<any>>(TemplateRef)

  protected destroyed$ = new Subject<void>();

  ngOnInit() {
    this.authSrv.isAuthenticated$
      .pipe(
        takeUntil(this.destroyed$)
      )
      .subscribe(isAuthenticated => {
        if (isAuthenticated) {
          this.viewContainer.createEmbeddedView(this.templatedRef);
        } else {
          this.viewContainer.clear();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}