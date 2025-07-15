import type { FC } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RiAttachment2 } from '@remixicon/react'
import { useFile } from './hooks'
import { useStore } from './store'
import type { FileUpload, FileEntity } from './types'
import { TransferMethod } from '@/types/app'
import FileFromLinkOrLocal from './file-from-link-or-local'
import FileInput from './file-input'
import {
  PortalToFollowElem,
  PortalToFollowElemContent,
  PortalToFollowElemTrigger,
} from '@/app/components/base/portal-to-follow-elem'
import Upload03 from '@/app/components/base/icons/line/upload-03'
import { RiLink } from '@remixicon/react'

type UploadOnlyFromLocalProps = {
  fileConfig: FileUpload
  disabled?: boolean
}
const UploadOnlyFromLocal: FC<UploadOnlyFromLocalProps> = ({
  fileConfig,
  disabled,
}) => {
  return (
    <div className={`
      relative flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-lg
      ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
    `}>
      <RiAttachment2 className='w-4 h-4 text-gray-500' />
      <FileInput fileConfig={fileConfig} />
    </div>
  )
}

type UploaderButtonProps = {
  fileConfig: FileUpload
  disabled?: boolean
}
const UploaderButton: FC<UploaderButtonProps> = ({
  fileConfig,
  disabled,
}) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { handleLocalFileUpload } = useFile(fileConfig)

  const hasUploadFromLocal = fileConfig.allowed_file_upload_methods?.includes(TransferMethod.local_file)
  const hasUploadFromUrl = fileConfig.allowed_file_upload_methods?.includes(TransferMethod.remote_url)

  const handleToggle = () => {
    if (disabled)
      return

    setOpen(v => !v)
  }

  const handleLocalUpload = (file: File) => {
    setOpen(false)
    handleLocalFileUpload(file)
  }

  return (
    <PortalToFollowElem
      open={open}
      onOpenChange={setOpen}
      placement='top-start'
    >
      <PortalToFollowElemTrigger onClick={handleToggle}>
        <div className={`
          relative flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-lg
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}>
          <RiAttachment2 className='w-4 h-4 text-gray-500' />
        </div>
      </PortalToFollowElemTrigger>
      <PortalToFollowElemContent className='z-50'>
        <div className='p-2 w-[260px] bg-white rounded-lg border-[0.5px] border-gray-200 shadow-lg'>
          {hasUploadFromUrl && (
            <FileFromLinkOrLocal
              showFromLocal={false}
              fileConfig={fileConfig}
              trigger={(open: boolean) => (
                <div className={`
                  flex items-center justify-center h-8 text-[13px] font-medium text-[#155EEF] rounded-lg cursor-pointer
                  ${open && 'bg-primary-50'}
                `}>
                  <RiLink className='mr-1 w-4 h-4' />
                  {t('common.fileUploader.pasteFileLink')}
                </div>
              )}
            />
          )}
          
          {hasUploadFromLocal && hasUploadFromUrl && (
            <div className='flex items-center mt-2 px-2 text-xs font-medium text-gray-400'>
              <div className='mr-3 w-[93px] h-[1px] bg-gradient-to-l from-[#F3F4F6]' />
              OR
              <div className='ml-3 w-[93px] h-[1px] bg-gradient-to-r from-[#F3F4F6]' />
            </div>
          )}
          
          {hasUploadFromLocal && (
            <div className='relative'>
              <div className={`
                flex items-center justify-center h-8 text-[13px] font-medium text-[#155EEF] rounded-lg cursor-pointer hover:bg-primary-50
              `}>
                <Upload03 className='mr-1 w-4 h-4' />
                {t('common.fileUploader.uploadFromComputer')}
              </div>
              <FileInput fileConfig={fileConfig} />
            </div>
          )}
        </div>
      </PortalToFollowElemContent>
    </PortalToFollowElem>
  )
}

type ChatDocumentUploaderProps = {
  fileConfig: FileUpload
  disabled?: boolean
}
const ChatDocumentUploader: FC<ChatDocumentUploaderProps> = ({
  fileConfig,
  disabled,
}) => {
  const files = useStore(s => s.files)
  const isDisabled = disabled || !!(fileConfig.number_limits && files.length >= fileConfig.number_limits)
  
  const onlyUploadLocal = fileConfig.allowed_file_upload_methods?.length === 1 && 
    fileConfig.allowed_file_upload_methods[0] === TransferMethod.local_file

  if (onlyUploadLocal) {
    return (
      <UploadOnlyFromLocal
        fileConfig={fileConfig}
        disabled={isDisabled}
      />
    )
  }

  return (
    <UploaderButton
      fileConfig={fileConfig}
      disabled={isDisabled}
    />
  )
}

export default ChatDocumentUploader