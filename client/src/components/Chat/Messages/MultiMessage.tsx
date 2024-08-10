import { useRecoilState } from 'recoil';
import { useEffect, useCallback } from 'react';
import type { TMessageProps } from '~/common';
// eslint-disable-next-line import/no-cycle
import Message from './Message';
// eslint-disable-next-line import/no-cycle
import MessageParts from './MessageParts';
import store from '~/store';

export default function MultiMessage({
  // messageId is used recursively here
  messageId,
  messagesTree,
  currentEditId,
  setCurrentEditId,
}: TMessageProps) {
  const [siblingIdx, setSiblingIdx] = useRecoilState(store.messagesSiblingIdxFamily(messageId));

  const setSiblingIdxRev = useCallback(
    (value: number) => {
      setSiblingIdx((messagesTree?.length ?? 0) - value - 1);
    },
    [messagesTree?.length, setSiblingIdx],
  );

  useEffect(() => {
    // reset siblingIdx when the tree changes, mostly when a new message is submitting.
    setSiblingIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesTree?.length]);

  useEffect(() => {
    if (messagesTree?.length && siblingIdx >= messagesTree?.length) {
      setSiblingIdx(0);
    }
  }, [siblingIdx, messagesTree?.length, setSiblingIdx]);

  if (!(messagesTree && messagesTree?.length)) {
    return null;
  }

  const message = messagesTree[messagesTree.length - siblingIdx - 1];

  if (!message) {
    return null;
  }

  if (message.content) {
    return (
      <MessageParts
        key={message.messageId}
        message={message}
        currentEditId={currentEditId}
        setCurrentEditId={setCurrentEditId}
        siblingIdx={messagesTree.length - siblingIdx - 1}
        siblingCount={messagesTree.length}
        setSiblingIdx={setSiblingIdxRev}
      />
    );
  }

  return (
    <Message
      key={message.messageId}
      message={message}
      currentEditId={currentEditId}
      setCurrentEditId={setCurrentEditId}
      siblingIdx={messagesTree.length - siblingIdx - 1}
      siblingCount={messagesTree.length}
      setSiblingIdx={setSiblingIdxRev}
    />
  );
}
