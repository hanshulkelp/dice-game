import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';

/** Cross-field validator — password and confirmPassword must match. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('password')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  form = this.fb.nonNullable.group(
    {
      email:           ['', [Validators.required, Validators.email]],
      game_username:   ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      password:        ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch }
  );

  showPassword        = signal(false);
  showConfirmPassword = signal(false);
  loading             = signal(false);
  errorMsg            = signal<string | null>(null);

  // Board decoration (left panel)
  readonly boardCells = Array.from({ length: 36 }, (_, i) => ({
    lit: [3, 11, 20, 29].includes(i),
  }));

  togglePassword():        void { this.showPassword.update(v => !v); }
  toggleConfirmPassword(): void { this.showConfirmPassword.update(v => !v); }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set(null);

    const { email, game_username, password } = this.form.getRawValue();
    this.auth.signup({ email, game_username, password }).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Could not create account. Please try again.');
        this.loading.set(false);
      },
    });
  }

  // Field-level error helpers
  get emailInvalid(): boolean {
    const c = this.form.controls.email;
    return c.invalid && c.touched;
  }
  get usernameInvalid(): boolean {
    const c = this.form.controls.game_username;
    return c.invalid && c.touched;
  }
  get passwordInvalid(): boolean {
    const c = this.form.controls.password;
    return c.invalid && c.touched;
  }
  get confirmInvalid(): boolean {
    const c = this.form.controls.confirmPassword;
    return (c.invalid || !!this.form.errors?.['mismatch']) && c.touched;
  }
  get mismatch(): boolean {
    return !!this.form.errors?.['mismatch'] && this.form.controls.confirmPassword.touched;
  }
}
