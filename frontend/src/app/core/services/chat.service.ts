import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, TimeoutError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse, ChatRequest, ChatResponse } from '../models/chat.models';

/** Longer than the backend's own AI timeout, so the backend's clearer error is shown first. */
const REQUEST_TIMEOUT_MS = 60_000;

const GENERIC_ERROR = 'Something went wrong while contacting the assistant. Please try again.';

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const inner = (value as { error: unknown }).error;
  return (
    typeof inner === 'object' &&
    inner !== null &&
    typeof (inner as { message?: unknown }).message === 'string'
  );
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly chatUrl = `${environment.apiBaseUrl.replace(/\/+$/, '')}/api/chat`;

  /** Sends a message (plus prior history) to the backend and emits the assistant's reply once. */
  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.chatUrl, request).pipe(timeout(REQUEST_TIMEOUT_MS));
  }

  /** Turns any failure into a short, user-friendly sentence. */
  toUserMessage(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'The assistant took too long to respond. Please try again.';
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Cannot reach the server. Check your connection and that the backend is running, then try again.';
      }
      if (isApiErrorResponse(error.error)) {
        return error.error.error.message;
      }
      if (error.status === 429) {
        return 'Too many requests. Please wait a moment and try again.';
      }
    }

    return GENERIC_ERROR;
  }
}
