/**
 * Seed script — inserts two test users, a game in 'in_progress' state,
 * game_player rows, and 4 ludo_pieces per player.
 *
 * Usage (from repo root):
 *   TS_NODE_PROJECT=apps/api/api/tsconfig.app.json \
 *   node -r tsconfig-paths/register -r ts-node/register \
 *   apps/api/api/src/scripts/seed-test-game.ts
 *
 * TODO: DELETE AFTER TESTING
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/api/.env') });

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../modules/users/user.entity';
import { Game } from '../modules/game/entities/game.entity';
import { GamePlayer } from '../modules/game/entities/game-player.entity';
import { LudoPiece } from '../modules/game/entities/ludo-piece.entity';
import { GameStatus } from '@dice-game/shared-types';

const ds = new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'],
  entities: [User, Game, GamePlayer, LudoPiece],
  synchronize: false,
  logging: false,
});

const COLORS = ['red', 'blue'] as const;

async function main() {
  await ds.initialize();
  console.log('Connected to DB');

  const userRepo   = ds.getRepository(User);
  const gameRepo   = ds.getRepository(Game);
  const gpRepo     = ds.getRepository(GamePlayer);
  const pieceRepo  = ds.getRepository(LudoPiece);

  // ── Insert / fetch test users ──────────────────────────────────────────────
  const testUsers = [
    { email: 'testuser1@test.com', game_username: 'TestUser1' },
    { email: 'testuser2@test.com', game_username: 'TestUser2' },
  ];

  const passwordHash = await bcrypt.hash('Test1234', 10);
  const users: User[] = [];

  for (const u of testUsers) {
    let user = await userRepo.findOne({ where: { email: u.email } });
    if (!user) {
      user = userRepo.create({
        email: u.email,
        game_username: u.game_username,
        password_hash: passwordHash,
      });
      await userRepo.save(user);
      console.log(`Created user: ${u.email}`);
    } else {
      console.log(`Found existing user: ${u.email} (id=${user.id})`);
    }
    users.push(user);
  }

  // ── Create game ────────────────────────────────────────────────────────────
  const roomId = `TEST-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  const game = gameRepo.create({
    room_id:      roomId,
    status:       GameStatus.InProgress,
    winner_id:    null,
    current_turn: users[0].id,
    dice_value:   null,
    dice_rolled:  false,
    moveable_pieces: '[]',
  });
  await gameRepo.save(game);
  console.log(`\nCreated game: id=${game.id}  roomId=${roomId}`);

  // ── game_players rows ──────────────────────────────────────────────────────
  for (const user of users) {
    const gp = gpRepo.create({ game, user });
    await gpRepo.save(gp);
    console.log(`  Added game_player: userId=${user.id}`);
  }

  // ── ludo_pieces rows  (4 per user) ─────────────────────────────────────────
  for (let i = 0; i < users.length; i++) {
    const color = COLORS[i];
    const pieces = [0, 1, 2, 3].map((j) =>
      pieceRepo.create({
        gameId:  game.id,
        userId:  users[i].id,
        pieceId: `${color}-${j}`,
        position: 0,
        status:  'home',
      }),
    );
    await pieceRepo.save(pieces);
    console.log(`  Inserted 4 pieces for ${users[i].email} (color=${color})`);
  }

  console.log(`\n✅ Seed complete.`);
  console.log(`   roomId    : ${roomId}`);
  console.log(`   gameId    : ${game.id}`);
  console.log(`   user1 id  : ${users[0].id}`);
  console.log(`   user2 id  : ${users[1].id}`);
  console.log(`\nDB check:`);
  console.log(`  SELECT piece_id, position, status FROM ludo_pieces WHERE game_id = '${game.id}';`);

  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
