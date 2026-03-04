import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  form = this.fb.nonNullable.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  showPassword = signal(false);
  loading      = signal(false);
  errorMsg     = signal<string | null>(null);

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        // Honour returnUrl set by authGuard, fall back to /home
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Invalid email or password');
        this.loading.set(false);
      },
    });
  }

  // Board decoration data (left panel)
  readonly boardCells = Array.from({ length: 36 }, (_, i) => ({
    lit: [8, 14, 21, 27].includes(i),
  }));

  // Field-level error helpers
  get emailInvalid(): boolean {
    const c = this.form.controls.email;
    return c.invalid && c.touched;
  }
  get passwordInvalid(): boolean {
    const c = this.form.controls.password;
    return c.invalid && c.touched;
  }
}
