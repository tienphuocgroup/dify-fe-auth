'use client'
import type { FC } from 'react'
import React, { useEffect, useRef } from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import Textarea from 'rc-textarea'
import s from './style.module.css'
import Answer from './answer'
import Question from './question'
import type { FeedbackFunc } from './type'
import type { ChatItem, VisionFile, VisionSettings } from '@/types/app'
import { TransferMethod } from '@/types/app'
import Tooltip from '@/app/components/base/tooltip'
import Toast from '@/app/components/base/toast'
import ChatImageUploader from '@/app/components/base/image-uploader/chat-image-uploader'
import ImageList from '@/app/components/base/image-uploader/image-list'
import { useImageFiles } from '@/app/components/base/image-uploader/hooks'
import FileUploaderInAttachment from '@/app/components/base/file-uploader-in-attachment'
import ChatDocumentUploader from '@/app/components/base/file-uploader-in-attachment/chat-document-uploader'
import type { FileEntity } from '@/app/components/base/file-uploader-in-attachment/types'
import { FileContextProvider } from '@/app/components/base/file-uploader-in-attachment/store'

export type IChatProps = {
  chatList: ChatItem[]
  /**
   * Whether to display the editing area and rating status
   */
  feedbackDisabled?: boolean
  /**
   * Whether to display the input area
   */
  isHideSendInput?: boolean
  onFeedback?: FeedbackFunc
  checkCanSend?: () => boolean
  onSend?: (message: string, files: VisionFile[]) => void
  useCurrentUserAvatar?: boolean
  isResponding?: boolean
  controlClearQuery?: number
  visionConfig?: VisionSettings
  fileUploadConfig?: any // 📎 NEW: Full file upload configuration from Dify
}

const Chat: FC<IChatProps> = ({
  chatList,
  feedbackDisabled = false,
  isHideSendInput = false,
  onFeedback,
  checkCanSend,
  onSend = () => { },
  useCurrentUserAvatar,
  isResponding,
  controlClearQuery,
  visionConfig,
  fileUploadConfig,
}) => {
  const { t } = useTranslation()
  const { notify } = Toast
  const isUseInputMethod = useRef(false)

  const [query, setQuery] = React.useState('')
  const queryRef = useRef('')

  const handleContentChange = (e: any) => {
    const value = e.target.value
    setQuery(value)
    queryRef.current = value
  }

  const logError = (message: string) => {
    notify({ type: 'error', message, duration: 3000 })
  }

  const valid = () => {
    const query = queryRef.current
    if (!query || query.trim() === '') {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return false
    }
    return true
  }

  useEffect(() => {
    if (controlClearQuery) {
      setQuery('')
      queryRef.current = ''
    }
  }, [controlClearQuery])
  const {
    files,
    onUpload,
    onRemove,
    onReUpload,
    onImageLinkLoadError,
    onImageLinkLoadSuccess,
    onClear,
  } = useImageFiles()

  // Document file state management
  const [documentFiles, setDocumentFiles] = React.useState<FileEntity[]>([])

  // Document upload detection based on backend configuration
  const hasDocumentUpload = fileUploadConfig?.enabled && 
    (fileUploadConfig?.allowed_file_types?.includes('document') || 
     fileUploadConfig?.allowed_file_types?.includes('custom'))

  const handleSend = () => {
    if (!valid() || (checkCanSend && !checkCanSend()))
      return
    
    // Process image files
    const imageFiles = files.filter(file => file.progress !== -1).map(fileItem => ({
      type: 'image',
      transfer_method: fileItem.type,
      url: fileItem.url,
      upload_file_id: fileItem.fileId,
    }))
    
    // Process document files
    const processedDocumentFiles = documentFiles.filter(file => file.progress !== -1).map(fileItem => ({
      type: fileItem.supportFileType,
      transfer_method: fileItem.transferMethod,
      url: fileItem.url || '',
      upload_file_id: fileItem.uploadedId || '',
    }))
    
    // Combine all files
    const allFiles = [...imageFiles, ...processedDocumentFiles]
    
    onSend(queryRef.current, allFiles)
    
    // Clear files after successful send
    const hasIncompleteImageFiles = files.find(item => item.type === TransferMethod.local_file && !item.fileId)
    const hasIncompleteDocumentFiles = documentFiles.find(item => item.transferMethod === TransferMethod.local_file && !item.uploadedId)
    
    if (!hasIncompleteImageFiles && !hasIncompleteDocumentFiles) {
      if (files.length)
        onClear()
      if (documentFiles.length)
        setDocumentFiles([])
      if (!isResponding) {
        setQuery('')
        queryRef.current = ''
      }
    }
  }

  const handleKeyUp = (e: any) => {
    if (e.code === 'Enter') {
      e.preventDefault()
      // prevent send message when using input method enter
      if (!e.shiftKey && !isUseInputMethod.current)
        handleSend()
    }
  }

  const handleKeyDown = (e: any) => {
    isUseInputMethod.current = e.nativeEvent.isComposing
    if (e.code === 'Enter' && !e.shiftKey) {
      const result = query.replace(/\n$/, '')
      setQuery(result)
      queryRef.current = result
      e.preventDefault()
    }
  }

  const suggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    queryRef.current = suggestion
    handleSend()
  }

  return (
    <div className={cn(!feedbackDisabled && 'px-3.5', 'h-full')}>
      {/* Chat List */}
      <div className="h-full space-y-[30px]">
        {chatList.map((item) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            return <Answer
              key={item.id}
              item={item}
              feedbackDisabled={feedbackDisabled}
              onFeedback={onFeedback}
              isResponding={isResponding && isLast}
              suggestionClick={suggestionClick}
            />
          }
          return (
            <Question
              key={item.id}
              id={item.id}
              content={item.content}
              useCurrentUserAvatar={useCurrentUserAvatar}
              imgSrcs={(item.message_files && item.message_files?.length > 0) ? item.message_files.map(item => item.url) : []}
            />
          )
        })}
      </div>
      {
        !isHideSendInput && (
          <div className={cn(!feedbackDisabled && '!left-3.5 !right-3.5', 'absolute z-10 bottom-0 left-0 right-0')}>
            <div className='p-[5.5px] max-h-[150px] bg-white border-[1.5px] border-gray-200 rounded-xl overflow-y-auto'>
              {/* File Lists Display */}
              {visionConfig?.enabled && files.length > 0 && (
                <div className='pl-2 mb-2'>
                  <ImageList
                    list={files}
                    onRemove={onRemove}
                    onReUpload={onReUpload}
                    onImageLinkLoadSuccess={onImageLinkLoadSuccess}
                    onImageLinkLoadError={onImageLinkLoadError}
                  />
                </div>
              )}
              
              {hasDocumentUpload && documentFiles.length > 0 && (
                <div className='pl-2 mb-2'>
                  <FileUploaderInAttachment
                    value={documentFiles}
                    onChange={setDocumentFiles}
                    fileConfig={fileUploadConfig}
                    showFileList={true}
                  />
                </div>
              )}
              
              {/* Upload Icons */}
              {visionConfig?.enabled && (
                <div className='absolute bottom-2 left-2 flex items-center'>
                  <ChatImageUploader
                    settings={visionConfig}
                    onUpload={onUpload}
                    disabled={files.length >= visionConfig.number_limits}
                  />
                  <div className='mx-1 w-[1px] h-4 bg-black/5' />
                </div>
              )}
              
              {hasDocumentUpload && (
                <div className={`absolute bottom-2 ${visionConfig?.enabled ? 'left-14' : 'left-2'} flex items-center`}>
                  <FileContextProvider
                    value={documentFiles}
                    onChange={setDocumentFiles}
                  >
                    <ChatDocumentUploader
                      fileConfig={fileUploadConfig}
                      disabled={!!(fileUploadConfig.number_limits && documentFiles.length >= fileUploadConfig.number_limits)}
                    />
                  </FileContextProvider>
                  <div className='mx-1 w-[1px] h-4 bg-black/5' />
                </div>
              )}
              
              <Textarea
                className={`
                  block w-full px-2 pr-[118px] py-[7px] leading-5 max-h-none text-sm text-gray-700 outline-none appearance-none resize-none
                  ${visionConfig?.enabled && hasDocumentUpload ? 'pl-24' : (visionConfig?.enabled || hasDocumentUpload) ? 'pl-12' : ''}
                `}
                value={query}
                onChange={handleContentChange}
                onKeyUp={handleKeyUp}
                onKeyDown={handleKeyDown}
                autoSize
              />
              <div className="absolute bottom-2 right-2 flex items-center h-8">
                <div className={`${s.count} mr-4 h-5 leading-5 text-sm bg-gray-50 text-gray-500`}>{query.trim().length}</div>
                <Tooltip
                  selector='send-tip'
                  htmlContent={
                    <div>
                      <div>{t('common.operation.send')} Enter</div>
                      <div>{t('common.operation.lineBreak')} Shift Enter</div>
                    </div>
                  }
                >
                  <div className={`${s.sendBtn} w-8 h-8 cursor-pointer rounded-md`} onClick={handleSend}></div>
                </Tooltip>
              </div>
            </div>
          </div>
        )
      }
    </div>
  )
}

export default React.memo(Chat)
