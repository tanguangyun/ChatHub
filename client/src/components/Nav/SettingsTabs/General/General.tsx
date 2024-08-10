import { useRecoilState } from 'recoil';
import * as Tabs from '@radix-ui/react-tabs';
import { SettingsTabValues } from 'librechat-data-provider';
import React, { useContext, useCallback, useRef } from 'react';
import type { TDangerButtonProps } from '~/common';
import { ThemeContext, useLocalize, useLocalStorage } from '~/hooks';
import HideSidePanelSwitch from './HideSidePanelSwitch';
import AutoScrollSwitch from './AutoScrollSwitch';
import ArchivedChats from './ArchivedChats';
import { Dropdown } from '~/components/ui';
import DangerButton from '../DangerButton';
import store from '~/store';

export const ThemeSelector = ({
  theme,
  onChange,
}: {
  theme: string;
  onChange: (value: string) => void;
}) => {
  const localize = useLocalize();

  const themeOptions = [
    { value: 'system', display: localize('com_nav_theme_system') },
    { value: 'dark', display: localize('com_nav_theme_dark') },
    { value: 'light', display: localize('com_nav_theme_light') },
  ];

  return (
    <div className="flex items-center justify-between">
      <div>{localize('com_nav_theme')}</div>

      <Dropdown
        value={theme}
        onChange={onChange}
        options={themeOptions}
        sizeClasses="w-[220px]"
        anchor="bottom start"
        testId="theme-selector"
      />
    </div>
  );
};

export const ClearChatsButton = ({
  confirmClear,
  className = '',
  showText = true,
  mutation,
  onClick,
}: Pick<
  TDangerButtonProps,
  'confirmClear' | 'mutation' | 'className' | 'showText' | 'onClick'
>) => {
  return (
    <DangerButton
      id="clearConvosBtn"
      mutation={mutation}
      confirmClear={confirmClear}
      className={className}
      showText={showText}
      infoTextCode="com_nav_clear_all_chats"
      actionTextCode="com_ui_clear"
      confirmActionTextCode="com_nav_confirm_clear"
      dataTestIdInitial="clear-convos-initial"
      dataTestIdConfirm="clear-convos-confirm"
      infoDescriptionCode="com_nav_info_clear_all_chats"
      onClick={onClick}
    />
  );
};

export const LangSelector = ({
  langcode,
  onChange,
}: {
  langcode: string;
  onChange: (value: string) => void;
}) => {
  const localize = useLocalize();

  // Create an array of options for the Dropdown
  const languageOptions = [
    { value: 'auto', display: localize('com_nav_lang_auto') },
    { value: 'en-US', display: localize('com_nav_lang_english') },
    { value: 'zh-CN', display: localize('com_nav_lang_chinese') },
    { value: 'zh-TW', display: localize('com_nav_lang_traditionalchinese') },
    { value: 'ar-EG', display: localize('com_nav_lang_arabic') },
    { value: 'de-DE', display: localize('com_nav_lang_german') },
    { value: 'es-ES', display: localize('com_nav_lang_spanish') },
    { value: 'fr-FR', display: localize('com_nav_lang_french') },
    { value: 'it-IT', display: localize('com_nav_lang_italian') },
    { value: 'pl-PL', display: localize('com_nav_lang_polish') },
    { value: 'pt-BR', display: localize('com_nav_lang_brazilian_portuguese') },
    { value: 'ru-RU', display: localize('com_nav_lang_russian') },
    { value: 'ja-JP', display: localize('com_nav_lang_japanese') },
    { value: 'sv-SE', display: localize('com_nav_lang_swedish') },
    { value: 'ko-KR', display: localize('com_nav_lang_korean') },
    { value: 'vi-VN', display: localize('com_nav_lang_vietnamese') },
    { value: 'tr-TR', display: localize('com_nav_lang_turkish') },
    { value: 'nl-NL', display: localize('com_nav_lang_dutch') },
    { value: 'id-ID', display: localize('com_nav_lang_indonesia') },
    { value: 'he-HE', display: localize('com_nav_lang_hebrew') },
    { value: 'fi-FI', display: localize('com_nav_lang_finnish') },
  ];

  return (
    <div className="flex items-center justify-between">
      <div>{localize('com_nav_language')}</div>

      <Dropdown
        value={langcode}
        onChange={onChange}
        sizeClasses="[--anchor-max-height:256px]"
        anchor="bottom start"
        options={languageOptions}
      />
    </div>
  );
};

function General() {
  const { theme, setTheme } = useContext(ThemeContext);

  const [langcode, setLangcode] = useRecoilState(store.lang);
  const [selectedLang, setSelectedLang] = useLocalStorage('selectedLang', langcode);

  const contentRef = useRef(null);

  const changeTheme = useCallback(
    (value: string) => {
      setTheme(value);
    },
    [setTheme],
  );

  const changeLang = useCallback(
    (value: string) => {
      setSelectedLang(value);
      if (value === 'auto') {
        const userLang = navigator.language || navigator.languages[0];
        setLangcode(userLang);
        localStorage.setItem('lang', userLang);
      } else {
        setLangcode(value);
        localStorage.setItem('lang', value);
      }
    },
    [setLangcode, setSelectedLang],
  );

  return (
    <Tabs.Content
      value={SettingsTabValues.GENERAL}
      role="tabpanel"
      className="w-full md:min-h-[271px]"
      ref={contentRef}
    >
      <div className="flex flex-col gap-3 text-sm text-text-primary">
        <div className="border-b pb-3 last-of-type:border-b-0 dark:border-gray-600">
          <ThemeSelector theme={theme} onChange={changeTheme} />
        </div>
        <div className="border-b pb-3 last-of-type:border-b-0 dark:border-gray-600">
          <LangSelector langcode={selectedLang} onChange={changeLang} />
        </div>
        <div className="border-b pb-3 last-of-type:border-b-0 dark:border-gray-600">
          <AutoScrollSwitch />
        </div>
        <div className="border-b pb-3 last-of-type:border-b-0 dark:border-gray-600">
          <HideSidePanelSwitch />
        </div>
        <div className="border-b pb-3 last-of-type:border-b-0 dark:border-gray-600">
          <ArchivedChats />
        </div>
        {/* <div className="border-b pb-3 last-of-type:border-b-0 dark:border-gray-600">
        </div> */}
      </div>
    </Tabs.Content>
  );
}

export default React.memo(General);
