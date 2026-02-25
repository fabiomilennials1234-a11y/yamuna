import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { updateProfile, updatePassword, linkGoogle } from './actions'
import { redirect } from 'next/navigation'
import { User, Lock, Mail, Globe } from 'lucide-react'
import { CacheSection } from './CacheSection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function SettingsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    const googleIdentity = user.identities?.find((id: any) => id.provider === 'google')

    const googleAvatar = googleIdentity?.identity_data?.avatar_url || googleIdentity?.identity_data?.picture;
    const finalAvatar = user.user_metadata.avatar_url || googleAvatar;

    return (
        <>
            <Header title="Configurações" />
            <main className="p-6 space-y-8 overflow-y-auto w-full max-w-4xl">

                {/* Profile Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            {finalAvatar ? (
                                <img src={finalAvatar} alt="Avatar" className="w-5 h-5 rounded-full" />
                            ) : (
                                <User size={20} />
                            )}
                        </div>
                        <CardTitle>Perfil</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form action={updateProfile} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                                <div className="flex items-center gap-2 px-3 py-2 bg-muted border rounded-lg text-muted-foreground cursor-not-allowed">
                                    <Mail size={16} />
                                    {user.email}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nome Completo</Label>
                                <Input
                                    type="text"
                                    name="full_name"
                                    id="full_name"
                                    defaultValue={user.user_metadata.full_name || user.user_metadata.name || ''}
                                    placeholder="Seu nome"
                                />
                            </div>
                            <div className="pt-2">
                                <Button type="submit">
                                    Salvar Alterações
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Security Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <Lock size={20} />
                        </div>
                        <CardTitle>Segurança</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form action={updatePassword} className="space-y-4 max-w-md">
                            <div className="space-y-2">
                                <Label htmlFor="password">Nova Senha</Label>
                                <Input
                                    type="password"
                                    name="password"
                                    id="password"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm_password">Confirmar Senha</Label>
                                <Input
                                    type="password"
                                    name="confirm_password"
                                    id="confirm_password"
                                />
                            </div>
                            <div className="pt-2">
                                <Button type="submit" variant="default" className="bg-emerald-600 hover:bg-emerald-500">
                                    Atualizar Senha
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Connections Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Globe size={20} />
                        </div>
                        <CardTitle>Contas Conectadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-xl">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white rounded-full">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-medium">Google</h3>
                                    <p className="text-sm text-muted-foreground">Usar sua conta Google para entrar</p>
                                </div>
                            </div>

                            {googleIdentity ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Conectado
                                </span>
                            ) : (
                                <form action={linkGoogle}>
                                    <Button type="submit" variant="link" className="text-primary hover:underline">
                                        Conectar
                                    </Button>
                                </form>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Cache & Data Section */}
                <CacheSection />
            </main>
        </>
    )
}
