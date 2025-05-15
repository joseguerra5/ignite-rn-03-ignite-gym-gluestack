import AsyncStorage from '@react-native-async-storage/async-storage'
import { AUTH_TOKEN_STORAGE } from './storage-config'

type StorageAuthTokenProps = {
  token: string
  refresh_token: string
}
export async function storageTokenSave({
  token,
  refresh_token,
}: StorageAuthTokenProps) {
  await AsyncStorage.setItem(
    AUTH_TOKEN_STORAGE,
    JSON.stringify({ token, refresh_token }),
  )
}

export async function storageTokenRemove() {
  await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE)
}

export async function storageTokenGet() {
  const response = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE)

  const { refresh_token, token }: StorageAuthTokenProps = response
    ? JSON.parse(response)
    : {}
  return { refresh_token, token }
}
