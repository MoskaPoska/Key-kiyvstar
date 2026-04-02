# Fix server.js - correct indentation and closing braces
$lines = Get-Content server.js -Encoding UTF8
$newLines = @()

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    
    # Line 607 (index 606) - blank line after if (!name)
    if ($i -eq 606) {
        $newLines += '            '
        $newLines += '            // Find person and update is_admin'
        $newLines += '            if (pool) {'
        $newLines += '              await pool.query('
        $newLines += "                'UPDATE people SET is_admin = true WHERE name = $1',"
        $newLines += '                [name]'
        $newLines += '              );'
        $newLines += '            } else {'
        $newLines += '              const person = memoryData.people.find(p => p.name === name);'
        $newLines += '              if (person) person.isAdmin = true;'
        $newLines += '            }'
        $newLines += ''
        $newLines += "            console.log('Admin set for:', name);"
        $newLines += "            sendJson(200, { ok: true, message: name + ' now admin' });"
    }
    # Line 621 (index 620) - catch and closing braces
    elseif ($i -eq 620) {
        $newLines += '          } catch (e) {'
        $newLines += '            sendJson(500, { error: ''Failed to set admin'' });'
        $newLines += '          }'
        $newLines += '        });'
        $newLines += '      });'
        $newLines += '      return;'
        $newLines += '    }'
    }
    # Skip old lines 608-625 (indices 607-624)
    elseif ($i -ge 607 -and $i -le 624) {
        continue
    }
    else {
        $newLines += $line
    }
}

Set-Content server.js -Value ($newLines -join "`n") -Encoding UTF8
Write-Host 'File fixed!'