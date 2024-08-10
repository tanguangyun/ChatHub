import { v4 } from 'uuid';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  QueryKeys,
  Constants,
  EndpointURLs,
  tPresetSchema,
  tMessageSchema,
  tConvoUpdateSchema,
} from 'librechat-data-provider';
import type {
  TMessage,
  TConversation,
  TSubmission,
  ConversationData,
} from 'librechat-data-provider';
import type { SetterOrUpdater, Resetter } from 'recoil';
import type { TResData, ConvoGenerator } from '~/common';
import {
  scrollToEnd,
  addConversation,
  deleteConversation,
  updateConversation,
  getConversationById,
} from '~/utils';
import useContentHandler from '~/hooks/SSE/useContentHandler';
import type { TGenTitleMutation } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';

type TSyncData = {
  sync: boolean;
  thread_id: string;
  messages?: TMessage[];
  requestMessage: TMessage;
  responseMessage: TMessage;
  conversationId: string;
};

export type EventHandlerParams = {
  isAddedRequest?: boolean;
  genTitle?: TGenTitleMutation;
  setCompleted: React.Dispatch<React.SetStateAction<Set<unknown>>>;
  setMessages: (messages: TMessage[]) => void;
  getMessages: () => TMessage[] | undefined;
  setIsSubmitting: SetterOrUpdater<boolean>;
  setConversation?: SetterOrUpdater<TConversation | null>;
  newConversation?: ConvoGenerator;
  setShowStopButton: SetterOrUpdater<boolean>;
  resetLatestMessage?: Resetter;
};

export default function useEventHandlers({
  genTitle,
  setMessages,
  getMessages,
  setCompleted,
  isAddedRequest,
  setConversation,
  setIsSubmitting,
  newConversation,
  setShowStopButton,
  resetLatestMessage,
}: EventHandlerParams) {
  const queryClient = useQueryClient();

  const { conversationId: paramId } = useParams();
  const { token } = useAuthContext();

  const contentHandler = useContentHandler({ setMessages, getMessages });

  const messageHandler = useCallback(
    (data: string, submission: TSubmission) => {
      const {
        messages,
        userMessage,
        plugin,
        plugins,
        initialResponse,
        isRegenerate = false,
      } = submission;

      if (isRegenerate) {
        setMessages([
          ...messages,
          {
            ...initialResponse,
            text: data,
            plugin: plugin ?? null,
            plugins: plugins ?? [],
            // unfinished: true
          },
        ]);
      } else {
        setMessages([
          ...messages,
          userMessage,
          {
            ...initialResponse,
            text: data,
            plugin: plugin ?? null,
            plugins: plugins ?? [],
            // unfinished: true
          },
        ]);
      }
    },
    [setMessages],
  );

  const cancelHandler = useCallback(
    (data: TResData, submission: TSubmission) => {
      const { requestMessage, responseMessage, conversation } = data;
      const { messages, isRegenerate = false } = submission;

      const convoUpdate = conversation ?? submission.conversation;

      // update the messages
      if (isRegenerate) {
        const messagesUpdate = [...messages, responseMessage].filter((msg) => msg);
        setMessages(messagesUpdate);
      } else {
        const messagesUpdate = [...messages, requestMessage, responseMessage].filter((msg) => msg);
        setMessages(messagesUpdate);
      }

      const isNewConvo = conversation.conversationId !== submission.conversation.conversationId;
      if (isNewConvo) {
        queryClient.setQueryData<ConversationData>([QueryKeys.allConversations], (convoData) => {
          if (!convoData) {
            return convoData;
          }
          return deleteConversation(convoData, submission.conversation.conversationId as string);
        });
      }

      // refresh title
      if (genTitle && isNewConvo && requestMessage?.parentMessageId === Constants.NO_PARENT) {
        setTimeout(() => {
          genTitle.mutate({ conversationId: convoUpdate.conversationId as string });
        }, 2500);
      }

      if (setConversation && !isAddedRequest) {
        setConversation((prevState) => {
          const update = {
            ...prevState,
            ...convoUpdate,
          };

          return update;
        });
      }

      setIsSubmitting(false);
    },
    [setMessages, setConversation, genTitle, isAddedRequest, queryClient, setIsSubmitting],
  );

  const syncHandler = useCallback(
    (data: TSyncData, submission: TSubmission) => {
      const { conversationId, thread_id, responseMessage, requestMessage } = data;
      const { initialResponse, messages: _messages, userMessage } = submission;

      const messages = _messages.filter((msg) => msg.messageId !== userMessage.messageId);

      setMessages([
        ...messages,
        requestMessage,
        {
          ...initialResponse,
          ...responseMessage,
        },
      ]);

      let update = {} as TConversation;
      if (setConversation && !isAddedRequest) {
        setConversation((prevState) => {
          let title = prevState?.title;
          const parentId = requestMessage.parentMessageId;
          if (parentId !== Constants.NO_PARENT && title?.toLowerCase()?.includes('new chat')) {
            const convos = queryClient.getQueryData<ConversationData>([QueryKeys.allConversations]);
            const cachedConvo = getConversationById(convos, conversationId);
            title = cachedConvo?.title;
          }

          update = tConvoUpdateSchema.parse({
            ...prevState,
            conversationId,
            thread_id,
            title,
            messages: [requestMessage.messageId, responseMessage.messageId],
          }) as TConversation;

          return update;
        });

        queryClient.setQueryData<ConversationData>([QueryKeys.allConversations], (convoData) => {
          if (!convoData) {
            return convoData;
          }
          if (requestMessage.parentMessageId === Constants.NO_PARENT) {
            return addConversation(convoData, update);
          } else {
            return updateConversation(convoData, update);
          }
        });
      } else if (setConversation) {
        setConversation((prevState) => {
          update = tConvoUpdateSchema.parse({
            ...prevState,
            conversationId,
            thread_id,
            messages: [requestMessage.messageId, responseMessage.messageId],
          }) as TConversation;
          return update;
        });
      }

      setShowStopButton(true);
      if (resetLatestMessage) {
        resetLatestMessage();
      }
    },
    [
      setMessages,
      setConversation,
      queryClient,
      isAddedRequest,
      setShowStopButton,
      resetLatestMessage,
    ],
  );

  const createdHandler = useCallback(
    (data: TResData, submission: TSubmission) => {
      const { messages, userMessage, isRegenerate = false } = submission;
      const initialResponse = {
        ...submission.initialResponse,
        parentMessageId: userMessage?.messageId,
        messageId: userMessage?.messageId + '_',
      };
      if (isRegenerate) {
        setMessages([...messages, initialResponse]);
      } else {
        setMessages([...messages, userMessage, initialResponse]);
      }

      const { conversationId, parentMessageId } = userMessage;

      let update = {} as TConversation;
      if (setConversation && !isAddedRequest) {
        setConversation((prevState) => {
          let title = prevState?.title;
          const parentId = isRegenerate ? userMessage?.overrideParentMessageId : parentMessageId;
          if (parentId !== Constants.NO_PARENT && title?.toLowerCase()?.includes('new chat')) {
            const convos = queryClient.getQueryData<ConversationData>([QueryKeys.allConversations]);
            const cachedConvo = getConversationById(convos, conversationId);
            title = cachedConvo?.title;
          }

          update = tConvoUpdateSchema.parse({
            ...prevState,
            conversationId,
            title,
          }) as TConversation;

          return update;
        });

        queryClient.setQueryData<ConversationData>([QueryKeys.allConversations], (convoData) => {
          if (!convoData) {
            return convoData;
          }
          if (parentMessageId === Constants.NO_PARENT) {
            return addConversation(convoData, update);
          } else {
            return updateConversation(convoData, update);
          }
        });
      } else if (setConversation) {
        setConversation((prevState) => {
          update = tConvoUpdateSchema.parse({
            ...prevState,
            conversationId,
          }) as TConversation;
          return update;
        });
      }

      if (resetLatestMessage) {
        resetLatestMessage();
      }

      scrollToEnd();
    },
    [setMessages, setConversation, queryClient, isAddedRequest, resetLatestMessage],
  );

  const finalHandler = useCallback(
    (data: TResData, submission: TSubmission) => {
      const { requestMessage, responseMessage, conversation, runMessages } = data;
      const { messages, conversation: submissionConvo, isRegenerate = false } = submission;

      setShowStopButton(false);
      setCompleted((prev) => new Set(prev.add(submission?.initialResponse?.messageId)));

      const currentMessages = getMessages();
      // Early return if messages are empty; i.e., the user navigated away
      if (!currentMessages?.length) {
        return setIsSubmitting(false);
      }

      // update the messages; if assistants endpoint, client doesn't receive responseMessage
      if (runMessages) {
        setMessages([...runMessages]);
      } else if (isRegenerate && responseMessage) {
        setMessages([...messages, responseMessage]);
      } else if (responseMessage) {
        setMessages([...messages, requestMessage, responseMessage]);
      }

      const isNewConvo = conversation.conversationId !== submissionConvo.conversationId;
      if (isNewConvo) {
        queryClient.setQueryData<ConversationData>([QueryKeys.allConversations], (convoData) => {
          if (!convoData) {
            return convoData;
          }
          return deleteConversation(convoData, submissionConvo.conversationId as string);
        });
      }

      // refresh title
      if (
        genTitle &&
        isNewConvo &&
        requestMessage &&
        requestMessage.parentMessageId === Constants.NO_PARENT
      ) {
        setTimeout(() => {
          genTitle.mutate({ conversationId: conversation.conversationId as string });
        }, 2500);
      }

      if (setConversation && !isAddedRequest) {
        setConversation((prevState) => {
          const update = {
            ...prevState,
            ...conversation,
          };

          if (prevState?.model && prevState.model !== submissionConvo.model) {
            update.model = prevState.model;
          }

          return update;
        });
      }

      setIsSubmitting(false);
    },
    [
      genTitle,
      queryClient,
      getMessages,
      setMessages,
      setCompleted,
      isAddedRequest,
      setConversation,
      setIsSubmitting,
      setShowStopButton,
    ],
  );

  const errorHandler = useCallback(
    ({ data, submission }: { data?: TResData; submission: TSubmission }) => {
      const { messages, userMessage, initialResponse } = submission;

      setCompleted((prev) => new Set(prev.add(initialResponse.messageId)));

      const conversationId = userMessage?.conversationId ?? submission?.conversationId;

      const parseErrorResponse = (data: TResData | Partial<TMessage>) => {
        const metadata = data['responseMessage'] ?? data;
        const errorMessage = {
          ...initialResponse,
          ...metadata,
          error: true,
          parentMessageId: userMessage?.messageId,
        };

        if (!errorMessage.messageId) {
          errorMessage.messageId = v4();
        }

        return tMessageSchema.parse(errorMessage);
      };

      if (!data) {
        const convoId = conversationId ?? v4();
        const errorResponse = parseErrorResponse({
          text: 'Error connecting to server, try refreshing the page.',
          ...submission,
          conversationId: convoId,
        });
        setMessages([...messages, userMessage, errorResponse]);
        if (newConversation) {
          newConversation({
            template: { conversationId: convoId },
            preset: tPresetSchema.parse(submission?.conversation),
          });
        }
        setIsSubmitting(false);
        return;
      }

      if (!conversationId && !data.conversationId) {
        const convoId = v4();
        const errorResponse = parseErrorResponse(data);
        setMessages([...messages, userMessage, errorResponse]);
        if (newConversation) {
          newConversation({
            template: { conversationId: convoId },
            preset: tPresetSchema.parse(submission?.conversation),
          });
        }
        setIsSubmitting(false);
        return;
      } else if (!data.conversationId) {
        const errorResponse = parseErrorResponse(data);
        setMessages([...messages, userMessage, errorResponse]);
        setIsSubmitting(false);
        return;
      }

      console.log('Error:', data);
      const errorResponse = tMessageSchema.parse({
        ...data,
        error: true,
        parentMessageId: userMessage?.messageId,
      });

      setMessages([...messages, userMessage, errorResponse]);
      if (data.conversationId && paramId === 'new' && newConversation) {
        newConversation({
          template: { conversationId: data.conversationId },
          preset: tPresetSchema.parse(submission?.conversation),
        });
      }

      setIsSubmitting(false);
      return;
    },
    [setMessages, paramId, setIsSubmitting, setCompleted, newConversation],
  );

  const abortConversation = useCallback(
    async (conversationId = '', submission: TSubmission, messages?: TMessage[]) => {
      const runAbortKey = `${conversationId}:${messages?.[messages.length - 1]?.messageId ?? ''}`;
      console.log({ conversationId, submission, messages, runAbortKey });
      const { endpoint: _endpoint, endpointType } = submission?.conversation || {};
      const endpoint = endpointType ?? _endpoint;
      try {
        const response = await fetch(`${EndpointURLs[endpoint ?? '']}/abort`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            abortKey: runAbortKey,
            endpoint,
          }),
        });

        // Check if the response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log(`[aborted] RESPONSE STATUS: ${response.status}`, data);
          if (response.status === 404) {
            setIsSubmitting(false);
            return;
          }
          if (data.final) {
            finalHandler(data, submission);
          } else {
            cancelHandler(data, submission);
          }
        } else if (response.status === 204) {
          const responseMessage = {
            ...submission.initialResponse,
          };

          const data = {
            requestMessage: submission.userMessage,
            responseMessage: responseMessage,
            conversation: submission.conversation,
          };
          console.log(`[aborted] RESPONSE STATUS: ${response.status}`, data);
          setIsSubmitting(false);
        } else {
          throw new Error(
            'Unexpected response from server; Status: ' +
              response.status +
              ' ' +
              response.statusText,
          );
        }
      } catch (error) {
        console.error('Error cancelling request');
        console.error(error);
        const convoId = conversationId ?? v4();
        const text =
          submission.initialResponse?.text?.length > 45 ? submission.initialResponse?.text : '';
        const errorMessage = {
          ...submission,
          ...submission.initialResponse,
          text: text ?? (error as Error).message ?? 'Error cancelling request',
          unfinished: !!text.length,
          error: true,
        };
        const errorResponse = tMessageSchema.parse(errorMessage);
        setMessages([...submission.messages, submission.userMessage, errorResponse]);
        if (newConversation) {
          newConversation({
            template: { conversationId: convoId },
            preset: tPresetSchema.parse(submission?.conversation),
          });
        }
        setIsSubmitting(false);
      }
    },
    [token, setIsSubmitting, finalHandler, cancelHandler, setMessages, newConversation],
  );

  return {
    syncHandler,
    finalHandler,
    errorHandler,
    messageHandler,
    contentHandler,
    createdHandler,
    abortConversation,
  };
}
