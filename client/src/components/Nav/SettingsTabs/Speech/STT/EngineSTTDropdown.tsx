import React from 'react';
import { useRecoilState } from 'recoil';
import { Dropdown } from '~/components/ui';
import { useLocalize } from '~/hooks';
import store from '~/store';

interface EngineSTTDropdownProps {
  external: boolean;
}

const EngineSTTDropdown: React.FC<EngineSTTDropdownProps> = ({ external }) => {
  const localize = useLocalize();
  const [engineSTT, setEngineSTT] = useRecoilState<string>(store.engineSTT);

  const endpointOptions = external
    ? [
      { value: 'browser', display: localize('com_nav_browser') },
      { value: 'external', display: localize('com_nav_external') },
    ]
    : [{ value: 'browser', display: localize('com_nav_browser') }];

  const handleSelect = (value: string) => {
    setEngineSTT(value);
  };

  return (
    <div className="flex items-center justify-between">
      <div>{localize('com_nav_engine')}</div>
      <Dropdown
        value={engineSTT}
        onChange={handleSelect}
        options={endpointOptions}
        sizeClasses="w-[180px]"
        anchor="bottom start"
        testId="EngineSTTDropdown"
      />
    </div>
  );
};

export default EngineSTTDropdown;
