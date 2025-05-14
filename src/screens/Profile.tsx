import { Button } from '@components/Button'
import { Input } from '@components/Input'
import { ScreenHeader } from '@components/ScreenHeader'
import { ToastMessage } from '@components/ToastMessage'
import { UserPhoto } from '@components/UserPhoto'
import {
  Center,
  Heading,
  set,
  Text,
  useToast,
  VStack,
} from '@gluestack-ui/themed'
import { yupResolver } from '@hookform/resolvers/yup'
import { useAuth } from '@hooks/useAuth'
import { api } from '@services/api'
import { AppError } from '@utils/AppError'
import * as FileSystem from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ScrollView, TouchableOpacity } from 'react-native'
import * as yup from 'yup'

type FormDataProps = {
  name: string
  email: string
  old_password: string
  password: string
  password_confirm: string
}

const updateProfileSchema = yup.object({
  email: yup.string().required('Informe o e-mail.').email('E-mail inválido.'),
  name: yup.string().required('Informe o nome.'),
  password: yup
    .string()
    .nullable()
    .transform((value) => value || null)
    .min(6, 'A senha deve ter pelo menos seis dígitos.'),
  old_password: yup.string().nullable(),
  password_confirm: yup
    .string()
    .nullable()
    .transform((value) => value || null)
    .oneOf([yup.ref('password'), null], 'As senhas não conferem.')
    .when('password', {
      is: (Field: any) => Field,
      then: yup
        .string()
        .nullable()
        .required('Confirme a senha.')
        .transform((value) => value || null),
    })
    .min(6, 'A senha deve ter pelo menos seis dígitos.'),
})

export function Profile() {
  const [photoIsLoading, setPhotoIsLoading] = useState(false)
  const [isUpdating, setUpdating] = useState(false)
  const [userPhoto, setUserPhoto] = useState(
    'https://github.com/arthurrios.png',
  )
  const { user, updateUserProfile } = useAuth()
  const toast = useToast()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormDataProps>({
    resolver: yupResolver(updateProfileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      old_password: '',
      password: '',
      password_confirm: '',
    },
  })

  async function handleUpdateProfile(data: FormDataProps) {
    try {
      setUpdating(true)

      const userUpdated = user
      userUpdated.name = data.name

      await api.put('/users', {
        data,
      })

      await updateUserProfile(userUpdated)

      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <ToastMessage
            id={id}
            action="success"
            title="Perfil atualizado com sucesso."
            onClose={() => toast.close(id)}
          />
        ),
      })
    } catch (error) {
      const isAppError = error instanceof AppError

      const title = isAppError
        ? error.message
        : 'Não foi possível atualizar o perfil. Tente novamente mais tarde.'

      setUpdating(false)
      toast.show({
        render: ({ id }) => {
          return (
            <ToastMessage
              title={title}
              id={id}
              onClose={() => toast.close(id)}
              action="error"
            />
          )
        },
      })
    } finally {
      setUpdating(false)
    }
  }

  async function handleUserPhotoSelect() {
    try {
      const photoSelected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        aspect: [4, 4],
        allowsEditing: true,
      })

      if (photoSelected.canceled) {
        return
      }

      const photoUri = photoSelected.assets[0].uri

      if (photoUri) {
        const photoInfo = (await FileSystem.getInfoAsync(photoUri)) as {
          size: number
        }

        if (photoInfo.size && photoInfo.size / 1024 / 1024 > 5) {
          return toast.show({
            placement: 'top',
            render: ({ id }) => (
              <ToastMessage
                id={id}
                action="error"
                title="Essa imagem é muito grande. Escolha uma de até 5MB"
                onClose={() => toast.close(id)}
              />
            ),
          })
        }

        const fileExtension = photoUri.split('.').pop()

        const photoFile = {
          name: `${user.name}-profile.${fileExtension}`.toLowerCase(),
          uri: photoUri,
          type: `${photoSelected.assets[0].type}/${fileExtension}`,
        }

        const userPhotoUploadForm = new FormData()
        userPhotoUploadForm.append('avatar', photoFile as any)

        const avatarUpdatedResponse = await api.patch(
          '/users/avatar',
          userPhotoUploadForm,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          },
        )

        const userUpdated = user
        userUpdated.avatar = avatarUpdatedResponse.data.avatar

        updateUserProfile(userUpdated)

        toast.show({
          placement: 'top',
          render: ({ id }) => (
            <ToastMessage
              id={id}
              action="success"
              title="Foto atualizada com sucesso."
              onClose={() => toast.close(id)}
            />
          ),
        })
      }
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <VStack flex={1}>
      <ScreenHeader title="Perfil" />

      <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
        <Center mt="$6" px="$10">
          <UserPhoto
            source={{ uri: userPhoto }}
            size="xl"
            alt="Imagem do usuário"
          />

          <TouchableOpacity onPress={handleUserPhotoSelect}>
            <Text
              color="$green500"
              fontFamily="$heading"
              fontSize="$md"
              mt="$2"
              mb="$8"
            >
              Alterar Foto
            </Text>
          </TouchableOpacity>

          <Center w="$full" gap="$4">
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="Nome"
                  bg="$gray600"
                  onChangeText={onChange}
                  value={value}
                  errorMessage={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  value={value}
                  bg="$gray600"
                  isReadOnly
                  onChange={onChange}
                  errorMessage={errors.email?.message}
                />
              )}
            />
            <Center />

            <Heading
              alignSelf="flex-start"
              fontFamily="$heading"
              color="$gray200"
              fontSize="$md"
              mt="$12"
              mb="$2"
            >
              Alterar senha
            </Heading>

            <Center w="$full" gap="$4">
              <Controller
                control={control}
                name="old_password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    placeholder="Senha antiga"
                    bg="$gray600"
                    secureTextEntry
                    onChangeText={onChange}
                    value={value}
                    errorMessage={errors.old_password?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    placeholder="Nova senha"
                    bg="$gray600"
                    secureTextEntry
                    onChangeText={onChange}
                    value={value}
                    errorMessage={errors.password?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="password_confirm"
                render={({ field: { onChange, value } }) => (
                  <Input
                    placeholder="Confirme a nova senha"
                    bg="$gray600"
                    secureTextEntry
                    onChangeText={onChange}
                    value={value}
                    errorMessage={errors.password_confirm?.message}
                  />
                )}
              />

              <Button
                title="Atualizar"
                onPress={handleSubmit(handleUpdateProfile)}
              />
            </Center>
          </Center>
        </Center>
      </ScrollView>
    </VStack>
  )
}
