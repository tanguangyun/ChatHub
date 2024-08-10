import { useMemo, memo } from 'react';
import { useRecoilValue } from 'recoil';
import { EditIcon } from 'lucide-react';
import { Controller, useFormContext, useFormState } from 'react-hook-form';
import AlwaysMakeProd from '~/components/Prompts/Groups/AlwaysMakeProd';
import { SaveIcon, CrossIcon } from '~/components/svg';
import { TextareaAutosize } from '~/components/ui';
import { PromptsEditorMode } from '~/common';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

const { promptsEditorMode } = store;

type Props = {
  name: string;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
};

const PromptEditor: React.FC<Props> = ({ name, isEditing, setIsEditing }) => {
  const localize = useLocalize();
  const { control } = useFormContext();
  const editorMode = useRecoilValue(promptsEditorMode);
  const { dirtyFields } = useFormState({ control: control });
  const { prompt } = dirtyFields as { prompt?: string };

  const EditorIcon = useMemo(() => {
    if (isEditing && prompt?.length == null) {
      return CrossIcon;
    }
    return isEditing ? SaveIcon : EditIcon;
  }, [isEditing, prompt]);

  return (
    <div>
      <h2 className="flex items-center justify-between rounded-t-lg border border-border-medium py-2 pl-4 text-base font-semibold text-text-primary">
        {localize('com_ui_prompt_text')}
        <div className="flex flex-row gap-6">
          {editorMode === PromptsEditorMode.ADVANCED && (
            <AlwaysMakeProd className="hidden sm:flex" />
          )}
          <button type="button" onClick={() => setIsEditing((prev) => !prev)} className="mr-2">
            <EditorIcon
              className={cn(
                'icon-lg',
                isEditing ? 'p-[0.05rem]' : 'text-gray-400 hover:text-gray-600',
              )}
            />
          </button>
        </div>
      </h2>
      <div
        role="button"
        className={cn(
          'min-h-[8rem] w-full rounded-b-lg border border-border-medium p-4 transition-all duration-150',
          { 'cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-100/10': !isEditing },
        )}
        onClick={() => !isEditing && setIsEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            !isEditing && setIsEditing(true);
          }
        }}
        tabIndex={0}
      >
        {!isEditing && (
          <EditIcon className="icon-xl absolute inset-0 m-auto hidden text-text-primary opacity-25 group-hover:block" />
        )}
        <Controller
          name={name}
          control={control}
          render={({ field }) =>
            isEditing ? (
              <TextareaAutosize
                {...field}
                className="w-full rounded border border-border-medium bg-transparent px-2 py-1 text-text-primary focus:outline-none"
                minRows={3}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsEditing(false);
                  }
                }}
              />
            ) : (
              <pre className="block h-full w-full whitespace-pre-wrap break-words px-2 py-1 text-left text-text-primary">
                {field.value}
              </pre>
            )
          }
        />
      </div>
    </div>
  );
};

export default memo(PromptEditor);
