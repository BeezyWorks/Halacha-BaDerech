import { Button, SemanticColor, Stack, Text, TextField } from '@beezyworks/design'
import React, { useState } from 'react'
import { Platform, Share } from 'react-native'

import { applyBackup, backupFilename, buildBackup, parseBackup } from '../dataBackup'

const isWeb = Platform.OS === 'web'

/** Web: save the JSON as a file download. Native: hand it to the share sheet. */
async function exportJson(json: string) {
  if (isWeb) {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = backupFilename()
    a.click()
    URL.revokeObjectURL(url)
  } else {
    await Share.share({ message: json, title: backupFilename() })
  }
}

/** Web only: let the user pick a .json file and resolve with its text. */
function pickJsonFile(): Promise<string | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(undefined)
      file.text().then(resolve, () => resolve(undefined))
    }
    input.click()
  })
}

/** Export / import of notes, bookmarks and settings as one JSON document. */
export function DataSettings() {
  const [importing, setImporting] = useState(false)
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState<{ text: string; error?: boolean }>()

  const onExport = async () => {
    try {
      await exportJson(JSON.stringify(buildBackup(), null, 2))
      setMessage(undefined)
    } catch {
      setMessage({ text: "Couldn't export your data.", error: true })
    }
  }

  const onChooseFile = async () => {
    const text = await pickJsonFile()
    if (text !== undefined) setDraft(text)
  }

  const onImport = () => {
    const parsed = parseBackup(draft)
    if (!parsed.ok) return setMessage({ text: parsed.error, error: true })
    applyBackup(parsed.backup)
    const { notes, bookmarks } = parsed.backup
    setMessage({
      text: `Imported ${notes.length} notes, ${bookmarks.length} bookmarks and your settings.`,
    })
    setImporting(false)
    setDraft('')
  }

  return (
    <>
      <Text variant="detail">
        Export your notes, bookmarks and settings as a JSON file. Importing replaces what's on this
        device.
      </Text>
      <Stack direction="row" gap="sm">
        <Button title="Export" variant="secondary" size="sm" onPress={onExport} />
        <Button
          title="Import"
          variant="secondary"
          size="sm"
          onPress={() => {
            setMessage(undefined)
            setImporting((v) => !v)
          }}
        />
      </Stack>
      {importing && (
        <Stack gap="sm">
          <TextField
            variant="boxed"
            multiline
            value={draft}
            onChangeText={setDraft}
            placeholder="Paste your backup JSON here"
            accessibilityLabel="Backup JSON"
          />
          <Stack direction="row" gap="sm">
            {isWeb && (
              <Button title="Choose file…" variant="ghost" size="sm" onPress={onChooseFile} />
            )}
            <Button
              title="Replace my data"
              variant="destructive"
              size="sm"
              onPress={onImport}
              disabled={!draft.trim()}
            />
          </Stack>
        </Stack>
      )}
      {message && (
        <Text
          variant="detail"
          color={message.error ? SemanticColor.TextDanger : SemanticColor.TextSecondary}
        >
          {message.text}
        </Text>
      )}
    </>
  )
}
