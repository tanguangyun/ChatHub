import React from 'react';
import { useRecoilState } from 'recoil';
import * as Tabs from '@radix-ui/react-tabs';
import { SettingsTabValues } from 'librechat-data-provider';
import HoverCardSettings from '../HoverCardSettings';
import DeleteAccount from './DeleteAccount';
import { Switch } from '~/components/ui';
import { useLocalize } from '~/hooks';
import Avatar from './Avatar';
import store from '~/store';

function Account({ onCheckedChange }: { onCheckedChange?: (value: boolean) => void }) {
  const [UsernameDisplay, setUsernameDisplay] = useRecoilState<boolean>(store.UsernameDisplay);
  const localize = useLocalize();

  const handleCheckedChange = (value: boolean) => {
    setUsernameDisplay(value);
    if (onCheckedChange) {
      onCheckedChange(value);
    }
  };

  return (
    <Tabs.Content
      value={SettingsTabValues.ACCOUNT}
      role="tabpanel"
      className="w-full md:min-h-[271px]"
    >
      <div className="flex flex-col gap-3 text-sm text-black dark:text-gray-50">
        <div className="border-b pb-3 last-of-type:border-b-0 dark:border-gray-600">
          <Avatar />
        </div>
        <div className="border-b pb-3 last-of-type:border-b-0 dark:border-gray-600">
          <DeleteAccount />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div>{localize('com_nav_user_name_display')}</div>
            <HoverCardSettings side="bottom" text="com_nav_info_user_name_display" />
          </div>
          <Switch
            id="UsernameDisplay"
            checked={UsernameDisplay}
            onCheckedChange={handleCheckedChange}
            className="ml-4 mt-2"
            data-testid="UsernameDisplay"
          />
        </div>
      </div>
    </Tabs.Content>
  );
}

export default React.memo(Account);
