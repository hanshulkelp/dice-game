import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, UpdateUserRequest } from '../../../core/auth.service';

type Panel = 'username' | 'password' | 'avatar' | null;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private fb     = inject(FormBuilder);
  protected auth = inject(AuthService);

  // ── Accordion state ────────────────────────────────────────
  openPanel = signal<Panel>(null);
  toggle(panel: Panel) {
    this.openPanel.set(this.openPanel() === panel ? null : panel);
  }

  // ── Profile stats ──────────────────────────────────────────
  user     = this.auth.currentUser;
  winRate  = computed(() => {
    const u = this.user();
    if (!u || !u.total_games) return '0.0';
    return ((u.total_wins / u.total_games) * 100).toFixed(1);
  });

  // ── Mock recent games (no game history API yet) ─────────────
  recentGames = [
    { result: 'WIN',  name: 'Kingdom Conquest', time: '2 hours ago',  rank: '1st' },
    { result: 'LOSS', name: 'High Stakes Roller', time: '5 hours ago', rank: '3rd' },
    { result: 'WIN',  name: 'Classic Board',      time: 'Yesterday',   rank: '1st' },
  ];

  // ── Forms ──────────────────────────────────────────────────
  usernameForm = this.fb.group({
    game_username: ['', [Validators.required, Validators.minLength(3)]],
  });

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: this.passwordsMatch });

  // ── State signals ──────────────────────────────────────────
  usernameLoading = signal(false);
  usernameError   = signal<string | null>(null);
  usernameSuccess = signal(false);

  passwordStrength = signal<string>('');
  passwordError    = signal<string | null>(null);
  passwordSuccess  = signal(false);

  showCurrent = signal(false);
  showNew     = signal(false);
  showConfirm = signal(false);

  ngOnInit() {
    // Pre-fill username field with current value
    const name = this.user()?.game_username;
    if (name) this.usernameForm.patchValue({ game_username: name });

    // Live password-strength feedback
    this.passwordForm.get('newPassword')!.valueChanges.subscribe(v => {
      this.passwordStrength.set(this.calcStrength(v ?? ''));
    });
  }

  saveUsername() {
    if (this.usernameForm.invalid) return;
    this.usernameLoading.set(true);
    this.usernameError.set(null);
    this.usernameSuccess.set(false);
    const val = this.usernameForm.value as UpdateUserRequest;
    this.auth.updateProfile(val).subscribe({
      next: () => { this.usernameSuccess.set(true); this.usernameLoading.set(false); },
      error: (e) => { this.usernameError.set(e?.error?.message ?? 'Update failed'); this.usernameLoading.set(false); },
    });
  }

  updatePassword() {
    if (this.passwordForm.invalid) return;
    // Password change API not yet wired — show placeholder
    this.passwordSuccess.set(true);
    setTimeout(() => this.passwordSuccess.set(false), 3000);
  }

  private passwordsMatch(g: AbstractControl): ValidationErrors | null {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  private calcStrength(pw: string): string {
    if (!pw) return '';
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return 'Weak';
    if (score <= 3) return 'Fair';
    if (score === 4) return 'Strong';
    return 'Very Strong';
  }
}

