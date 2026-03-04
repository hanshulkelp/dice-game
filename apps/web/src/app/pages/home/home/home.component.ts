import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  protected auth   = inject(AuthService);
  private   router = inject(Router);

  cells = Array.from({ length: 25 }, (_, i) => ({
    highlight: [7, 12, 17].includes(i),
  }));

  startPlaying(): void {
    this.router.navigate([this.auth.isLoggedIn() ? '/lobby' : '/auth/login']);
  }
}

