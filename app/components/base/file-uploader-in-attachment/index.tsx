import {
  useCallback,
} from 'react'
import {
  RiLink,
  RiUploadCloud2Line,
} from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { useFile } from './hooks'
import type { FileEntity, FileUpload } from './types'
import FileFromLinkOrLocal from './file-from-link-or-local'
import {
  FileContextProvider,
  useStore,
} from './store'
import FileInput from './file-input'
import FileItem from './file-item'
import Button from '@/app/components/base/button'
import cn from '@/utils/classnames'
import { TransferMethod } from '@/types/app'

type Option = {
  value: string
  label: string
  icon: JSX.Element
}
type FileUploaderInAttachmentProps = {
  fileConfig: FileUpload
  value?: FileEntity[]
  onChange?: (files: FileEntity[]) => void
  showFileList?: boolean
}
const FileUploaderInAttachment = ({
  fileConfig,
  value,
  onChange,
  showFileList = true,
}: FileUploaderInAttachmentProps) => {
  const { t } = useTranslation()
  const files = useStore(s => s.files)
  const {
    handleRemoveFile,
    handleReUploadFile,
  } = useFile(fileConfig)
  const options = [
    {
      value: TransferMethod.local_file,
      label: t('common.fileUploader.uploadFromComputer'),
      icon: <RiUploadCloud2Line className='h-4 w-4' />,
    },
    {
      value: TransferMethod.remote_url,
      label: t('common.fileUploader.pasteFileLink'),
      icon: <RiLink className='h-4 w-4' />,
    },
  ]

  const renderButton = useCallback((option: Option, open?: boolean) => {
    return (
      <Button
        key={option.value}
        variant='tertiary'
        className={cn(
          'relative flex items-center justify-center px-3 py-2 text-sm font-medium transition-colors',
          'border border-gray-300 rounded-md',
          'hover:bg-gray-50 hover:border-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          open && 'bg-gray-50 border-gray-400'
        )}
        disabled={!!(fileConfig.number_limits && files.length >= fileConfig.number_limits)}
      >
        {option.icon}
        <span className='ml-1'>{option.label}</span>
        {
          option.value === TransferMethod.local_file && (
            <FileInput fileConfig={fileConfig} />
          )
        }
      </Button>
    )
  }, [fileConfig, files.length])
  const renderTrigger = useCallback((option: Option) => {
    return (open: boolean) => renderButton(option, open)
  }, [renderButton])
  const renderOption = useCallback((option: Option) => {
    if (option.value === TransferMethod.local_file && fileConfig?.allowed_file_upload_methods?.includes(TransferMethod.local_file))
      return renderButton(option)

    if (option.value === TransferMethod.remote_url && fileConfig?.allowed_file_upload_methods?.includes(TransferMethod.remote_url)) {
      return (
        <FileFromLinkOrLocal
          key={option.value}
          showFromLocal={false}
          trigger={renderTrigger(option)}
          fileConfig={fileConfig}
        />
      )
    }
  }, [renderButton, renderTrigger, fileConfig])

  return (
    <div>
      <div className='flex flex-wrap items-center gap-2'>
        {options.map(renderOption)}
      </div>
      {showFileList && (
        <div className='mt-2 space-y-2 max-h-40 overflow-y-auto'>
          {
            files.map(file => (
              <FileItem
                key={file.id}
                file={file}
                showDeleteAction
                showDownloadAction={false}
                onRemove={() => handleRemoveFile(file.id)}
                onReUpload={() => handleReUploadFile(file.id)}
              />
            ))
          }
        </div>
      )}
    </div>
  )
}

type FileUploaderInAttachmentWrapperProps = {
  value?: FileEntity[]
  onChange: (files: FileEntity[]) => void
  fileConfig: FileUpload
  showFileList?: boolean
}
const FileUploaderInAttachmentWrapper = ({
  value,
  onChange,
  fileConfig,
  showFileList = true,
}: FileUploaderInAttachmentWrapperProps) => {
  return (
    <FileContextProvider
      value={value}
      onChange={onChange}
    >
      <FileUploaderInAttachment fileConfig={fileConfig} showFileList={showFileList} />
    </FileContextProvider>
  )
}

export default FileUploaderInAttachmentWrapper
