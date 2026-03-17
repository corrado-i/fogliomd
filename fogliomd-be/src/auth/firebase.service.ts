import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService {
  constructor(private configService: ConfigService) {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');

    if (!projectId || projectId === 'your-project-id') {
      console.warn(
        'FIREBASE_PROJECT_ID is not set or is using the placeholder. ' +
        'Firebase Admin will not be initialized correctly until a valid Project ID is provided in .env.',
      );
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: projectId,
      });
    }
  }

  /**
   * Verifica che il token bearer sia valido e non sia scaduto.
   * Il metodo verifyIdToken controlla in automatico la firma e la scadenza (exp).
   */
  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return admin.auth().verifyIdToken(token);
  }
}