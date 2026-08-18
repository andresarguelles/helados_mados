import type { Tables } from './database.types'

export type Profile = Tables<'profiles'>
export type Dynamic = Tables<'dynamics'>

export type CouponStatus = 'active' | 'redeemed' | 'expired'
export type Coupon = Omit<Tables<'coupons'>, 'status'> & { status: CouponStatus }
