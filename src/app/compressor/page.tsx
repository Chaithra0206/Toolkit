/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { redirect } from 'next/navigation';

export default function CompressorPageRedirect() {
  // Gracefully forward legacy URLs to the new root compressor page
  redirect('/');
}
