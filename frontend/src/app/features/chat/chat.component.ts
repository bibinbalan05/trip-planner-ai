import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatMessage, ChatRequest } from '../../core/models/chat.models';
import { ChatService } from '../../core/services/chat.service';
import { FormatMessagePipe } from './format-message.pipe';

/** Keep in sync with the backend limits in backend/src/schemas/chat.schema.ts. */
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 30;

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [ReactiveFormsModule, FormatMessagePipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent {
  private readonly chatService = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly maxMessageLength = MAX_MESSAGE_LENGTH;

  protected readonly suggestedPrompts: readonly string[] = [
    'Plan a 5-day trip to Italy',
    'Create a weekend itinerary in Stockholm',
    'Plan a budget-friendly trip to Japan',
    'Suggest a 3-day city break',
  ];

  protected readonly form = new FormGroup({
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(MAX_MESSAGE_LENGTH)],
    }),
  });

  /** Conversation state lives only in the browser for this MVP (no database). */
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly draft = toSignal(this.form.controls.message.valueChanges, { initialValue: '' });

  protected readonly canSend = computed(() => {
    const text = this.draft().trim();
    return !this.loading() && text.length > 0 && this.draft().length <= MAX_MESSAGE_LENGTH;
  });

  protected readonly remainingCharacters = computed(() => MAX_MESSAGE_LENGTH - this.draft().length);

  private readonly messageList = viewChild<ElementRef<HTMLElement>>('messageList');
  private readonly messageInput = viewChild<ElementRef<HTMLTextAreaElement>>('messageInput');

  private nextId = 1;
  private pendingRequest: ChatRequest | null = null;
  private inFlight: Subscription | null = null;

  constructor() {
    // Auto-scroll whenever messages, the loading indicator or the error box change.
    effect(() => {
      this.messages();
      this.loading();
      this.errorMessage();
      this.scrollToBottom();
    });
  }

  protected onSubmit(): void {
    if (!this.canSend()) return;

    const text = this.form.controls.message.value.trim();
    this.form.reset({ message: '' });
    this.sendMessage(text);
  }

  /** Enter sends; Shift+Enter inserts a new line. Ignored while an IME is composing text. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  protected useSuggestion(prompt: string): void {
    if (this.loading()) return;
    this.sendMessage(prompt);
  }

  protected retry(): void {
    if (this.pendingRequest && !this.loading()) {
      this.dispatch(this.pendingRequest);
    }
  }

  protected newChat(): void {
    this.inFlight?.unsubscribe();
    this.inFlight = null;
    this.pendingRequest = null;
    this.messages.set([]);
    this.errorMessage.set(null);
    this.loading.set(false);
    this.form.reset({ message: '' });
    this.focusInput();
  }

  private sendMessage(text: string): void {
    // History = everything said before this message.
    const history = this.messages()
      .slice(-MAX_HISTORY_ITEMS)
      .map(({ role, text: previous }) => ({ role, text: previous }));

    this.messages.update((current) => [...current, { id: this.nextId++, role: 'user', text }]);

    const request: ChatRequest = { message: text, history };
    this.pendingRequest = request;
    this.dispatch(request);
  }

  private dispatch(request: ChatRequest): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.inFlight = this.chatService
      .sendMessage(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.messages.update((current) => [
            ...current,
            { id: this.nextId++, role: 'model', text: response.reply },
          ]);
          this.pendingRequest = null;
          this.loading.set(false);
          this.focusInput();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.chatService.toUserMessage(error));
          this.loading.set(false);
          this.focusInput();
        },
      });
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const element = this.messageList()?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    });
  }

  private focusInput(): void {
    setTimeout(() => this.messageInput()?.nativeElement.focus());
  }
}
