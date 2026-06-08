import { ref, set, update, onValue, get, remove } from 'firebase/database';
import { rtdb } from './config';

export interface LobbyParticipant {
  uid: string;
  name: string;
  score: number;
}

export interface GameLobby {
  lobby_id: string;
  host_id: string;
  deck_id: string;
  game_state: 'waiting' | 'active' | 'ended';
  current_question_index: number;
  joined_players: { [uid: string]: LobbyParticipant };
}

/**
 * Initiates a new Realtime multiplayer study lobby ("Join PIN code Mode")
 * 
 * @param deckId The underlying academic Quiz Deck identifier to query
 * @param hostId Authenticated student host/teacher identity
 * @returns 6-digit dynamic Lobby ID code for live participants
 */
export async function hostGameLobby(deckId: string, hostId: string): Promise<string> {
  // Generate random 6-digit room entry code PIN
  const lobbyId = Math.floor(100000 + Math.random() * 900000).toString();
  const lobbyPath = `lobbies/${lobbyId}`;
  const lobbyRef = ref(rtdb, lobbyPath);

  const newLobby: GameLobby = {
    lobby_id: lobbyId,
    host_id: hostId,
    deck_id: deckId,
    game_state: 'waiting',
    current_question_index: 0,
    joined_players: {}
  };

  await set(lobbyRef, newLobby);
  console.log(`[Mooderia Multiplayer] Hosted live Lobby room code: ${lobbyId} for Deck: ${deckId}`);
  return lobbyId;
}

/**
 * Connects standard participants into the live, syncing RTDB lobby room
 */
export async function joinGameLobby(lobbyId: string, playerUid: string, playerName: string): Promise<void> {
  const playerPath = `lobbies/${lobbyId}/joined_players/${playerUid}`;
  const playerRef = ref(rtdb, playerPath);

  const participant: LobbyParticipant = {
    uid: playerUid,
    name: playerName,
    score: 0
  };

  // Verify lobby exists beforehand
  const lobbyCheckRef = ref(rtdb, `lobbies/${lobbyId}`);
  const snapshot = await get(lobbyCheckRef);
  if (!snapshot.exists()) {
    throw new Error(`Invalid study session PIN: Lobby ${lobbyId} not found.`);
  }

  await set(playerRef, participant);
  console.log(`[Mooderia Multiplayer] Student '${playerName}' joined Lobby: ${lobbyId}`);
}

/**
 * Moves question sliders forward simultaneously for everyone in the room
 */
export async function advanceLobbyQuestion(lobbyId: string, nextIndex: number): Promise<void> {
  const questionPath = `lobbies/${lobbyId}`;
  const questionRef = ref(rtdb, questionPath);

  await update(questionRef, { current_question_index: nextIndex });
  console.log(`[Mooderia Multiplayer] Question slider advanced to Index: ${nextIndex} for Lobby: ${lobbyId}`);
}

/**
 * Progresses the game phase (waiting -> active -> ended)
 */
export async function updateLobbyGameState(lobbyId: string, state: 'waiting' | 'active' | 'ended'): Promise<void> {
  const stateRef = ref(rtdb, `lobbies/${lobbyId}`);
  await update(stateRef, { game_state: state });
}

/**
 * Updates a specific participant's score on real-time speedboards
 */
export async function updatePlayerScore(lobbyId: string, playerUid: string, addScore: number): Promise<void> {
  const scorePath = `lobbies/${lobbyId}/joined_players/${playerUid}`;
  const scoreRef = ref(rtdb, scorePath);

  const snap = await get(scoreRef);
  if (snap.exists()) {
    const currentData = snap.val() as LobbyParticipant;
    const previousScore = currentData.score || 0;
    await update(scoreRef, { score: previousScore + addScore });
  }
}

/**
 * Listens to Realtime values changed in the lobby, pushing updates instantly (under 100ms)
 */
export function listenToLobbyState(lobbyId: string, onUpdate: (lobby: GameLobby) => void): () => void {
  const lobbyRef = ref(rtdb, `lobbies/${lobbyId}`);

  const unsubscribe = onValue(lobbyRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.val() as GameLobby);
    }
  });

  return unsubscribe; // Unsubscribe callback to prevent persistent network listener waste
}

/**
 * Clears lobby dataset once host terminates the multiplayer session
 */
export async function deleteGameLobby(lobbyId: string): Promise<void> {
  const lobbyRef = ref(rtdb, `lobbies/${lobbyId}`);
  await remove(lobbyRef);
  console.log(`[Mooderia Multiplayer] Session terminated for lobby: ${lobbyId}`);
}
