'use client'

import { api } from './api'

export async function updateProfile(data: { nome: string; cargo: string }) {
  return api.patch<unknown>('/auth/me/', data)
}

export async function updateAvatar(file: File) {
  const fd = new FormData()
  fd.append('avatar', file)
  return api.upload<unknown>('/auth/me/', fd, 'PATCH')
}

export async function changePassword(oldPassword: string, newPassword: string) {
  return api.post<{ detail: string }>('/auth/change-password/', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}
