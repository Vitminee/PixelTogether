package debug

import (
	"log"
	"os"
	"strings"
)

var isDebugEnabled = false

func init() {
	debug := strings.ToLower(os.Getenv("DEBUG"))
	isDebugEnabled = debug == "true" || debug == "1"
}

// Printf logs debug messages only if DEBUG=true
func Printf(format string, v ...interface{}) {
	if isDebugEnabled {
		log.Printf("[DEBUG] "+format, v...)
	}
}

// Println logs debug messages only if DEBUG=true
func Println(v ...interface{}) {
	if isDebugEnabled {
		log.Println(append([]interface{}{"[DEBUG]"}, v...)...)
	}
}

// IsEnabled returns true if debug logging is enabled
func IsEnabled() bool {
	return isDebugEnabled
}